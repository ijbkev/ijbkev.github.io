<?php
declare(strict_types=1);

require_once __DIR__ . '/vendor/autoload.php';

use setasign\Fpdi\PdfReader\PageBoundaries;
use setasign\Fpdi\Tcpdf\Fpdi;

function h(mixed $value): string {
    return htmlspecialchars(preg_replace('/[\p{Extended_Pictographic}\x{FE0F}\x{200D}]/u', '', (string) $value), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function money_eur(int $cents): string {
    return 'EUR ' . number_format($cents / 100, 2, '.', ',');
}

function pdf_instance(): Fpdi {
    $pdf = new Fpdi('P', 'mm', 'A4', true, 'UTF-8', false);
    $pdf->SetCreator('IJBK e.V.');
    $pdf->SetAuthor('IJBK e.V.');
    $pdf->setPrintHeader(false);
    $pdf->setPrintFooter(false);
    $pdf->SetMargins(15, 15, 15);
    $pdf->SetAutoPageBreak(false);
    $pdf->SetFont('dejavusans', '', 9);
    return $pdf;
}

function add_heading(Fpdi $pdf, string $title, string $subtitle = ''): void {
    $pdf->AddPage('P', 'A4');
    $pdf->SetFillColor(23, 37, 84);
    $pdf->Rect(0, 0, 210, 38, 'F');
    $pdf->SetTextColor(255, 255, 255);
    $pdf->SetFont('dejavusans', '', 8);
    $pdf->SetXY(10, 10);
    $pdf->Cell(190, 4, 'IJBK e.V. / ERASMUS+', 0, 1);
    $pdf->SetFont('dejavusans', 'B', 20);
    $pdf->SetX(10);
    $pdf->Cell(190, 9, $title, 0, 1);
    if ($subtitle !== '') {
        $pdf->SetFont('dejavusans', '', 9);
        $pdf->SetX(10);
        $pdf->Cell(190, 5, $subtitle, 0, 1);
    }
    $pdf->SetTextColor(20, 24, 35);
    $pdf->SetFont('dejavusans', '', 9);
}

/** @param array<int,array{0:string,1:string}> $rows */
function rows_html(array $rows): string {
    $html = '<table border="0" cellspacing="0" cellpadding="3" style="font-size:9pt;width:100%">';
    foreach ($rows as [$label, $value]) {
        $html .= '<tr><td style="color:#596273;width:34%">' . h($label) . '</td>'
            . '<td style="width:66%">' . nl2br(h($value)) . '</td></tr>';
    }
    return $html . '</table>';
}

function section_title(string $number, string $title): string {
    return '<div style="background-color:#e8edf5;padding:3mm;font-size:12pt;font-weight:bold">'
        . h($number . ' ' . $title) . '</div>';
}

function place_ticket_image(Fpdi $pdf, string $path, float $x, float $y, float $maxW, float $maxH): void {
    $size = @getimagesize($path);
    if ($size === false || $size[0] < 1 || $size[1] < 1) {
        throw new RuntimeException('Invalid ticket image');
    }
    $scale = min($maxW / $size[0], $maxH / $size[1]);
    $width = $size[0] * $scale;
    $height = $size[1] * $scale;
    $pdf->Image($path, $x + (($maxW - $width) / 2), $y + (($maxH - $height) / 2), $width, $height, '', '', '', false, 300, '', false, false, 0, true);
}

/**
 * Expand modern compressed PDF object streams into the classic structure
 * understood by the free FPDI parser. The original attachment is left intact
 * for storage, download, and forensic review.
 */
function normalize_pdf_for_fpdi(string $path): string {
    if (!function_exists('proc_open')) {
        throw new RuntimeException('qpdf normalization is unavailable');
    }
    $temporary = tempnam(sys_get_temp_dir(), 'ijbk-fpdi-');
    if ($temporary === false) {
        throw new RuntimeException('Unable to prepare compatible ticket PDF');
    }
    $configured = getenv('IJBK_QPDF_BINARY');
    $binary = is_string($configured) && $configured !== '' ? $configured : 'qpdf';
    $descriptors = [
        0 => ['file', '/dev/null', 'r'],
        1 => ['file', '/dev/null', 'a'],
        2 => ['file', '/dev/null', 'a'],
    ];
    try {
        $process = proc_open(
            [$binary, '--decrypt', '--object-streams=disable', '--', $path, $temporary],
            $descriptors,
            $pipes,
            null,
            null,
            ['bypass_shell' => true],
        );
        if (!is_resource($process)) {
            throw new RuntimeException('Unable to start qpdf normalization');
        }
        $deadline=microtime(true)+20;
        do {
            $state=proc_get_status($process);
            if(!$state['running'])break;
            if(microtime(true)>$deadline){proc_terminate($process,9);proc_close($process);throw new RuntimeException('PDF compatibility processing timed out');}
            usleep(50000);
        } while(true);
        $status=$state['exitcode'];proc_close($process);
        if (!in_array($status, [0, 3], true) || !is_file($temporary) || filesize($temporary) < 5
            || file_get_contents($temporary, false, null, 0, 5) !== '%PDF-') {
            throw new RuntimeException('qpdf could not normalize the ticket PDF');
        }
        chmod($temporary, 0600);
        return $temporary;
    } catch (Throwable $error) {
        @unlink($temporary);
        throw new RuntimeException('Unable to normalize the ticket PDF', 0, $error);
    }
}

/**
 * Place every page of one uploaded PDF onto the single output page reserved
 * for that ticket. This preserves the one-ticket-per-page format while still
 * retaining receipts whose scan contains several pages.
 */
function place_ticket_pdf(Fpdi $pdf, string $path, float $x, float $y, float $maxW, float $maxH, array &$temporaryFiles): void {
    try {
        $count = $pdf->setSourceFile($path);
    } catch (Throwable $error) {
        $compatiblePath = normalize_pdf_for_fpdi($path);
        $temporaryFiles[] = $compatiblePath;
        try {
            $count = $pdf->setSourceFile($compatiblePath);
        } catch (Throwable $normalizedError) {
            throw new RuntimeException('Unreadable or encrypted ticket PDF', 0, $normalizedError);
        }
    }
    if ($count < 1) {
        throw new RuntimeException('PDF has no readable pages');
    }
    $cols = $count === 1 ? 1 : 2;
    $rows = (int) ceil(min($count,10) / $cols);
    $gap = 3.0;
    $cellW = ($maxW - (($cols - 1) * $gap)) / $cols;
    $cellH = ($maxH - (($rows - 1) * $gap)) / $rows;
    for ($pageNumber = 1; $pageNumber <= $count; $pageNumber++) {
        if($pageNumber>1&&($pageNumber-1)%10===0){$pdf->AddPage();$pdf->SetFont('dejavusans','',8);$pdf->MultiCell(180,5,'Supporting document continued - source page '.$pageNumber,0,'L',false,1);}
        $template = $pdf->importPage($pageNumber, PageBoundaries::CROP_BOX);
        $size = $pdf->getTemplateSize($template);
        if (!is_array($size) || $size['width'] <= 0 || $size['height'] <= 0) {
            throw new RuntimeException('Invalid ticket PDF page');
        }
        $scale = min($cellW / $size['width'], $cellH / $size['height']);
        $width = $size['width'] * $scale;
        $height = $size['height'] * $scale;
        $col = ($pageNumber - 1) % $cols;
        $row = (int) floor((($pageNumber - 1)%10) / $cols);
        $cellX = $x + ($col * ($cellW + $gap));
        $cellY = $y + ($row * ($cellH + $gap));
        $pdf->useTemplate(
            $template,
            $cellX + (($cellW - $width) / 2),
            $cellY + (($cellH - $height) / 2),
            $width,
            $height,
            false,
        );
    }
}

class DeclarationPdf extends Fpdi {
    public string $declarationTitle = '';
    public string $reference = '';
    public function Header() {
        $ngo=__DIR__.'/assets/ngo-logo.png'; if (!is_file($ngo)) $ngo=dirname(__DIR__).'/public/logo.png';
        $erasmus=__DIR__.'/assets/erasmus-logo.png'; if (!is_file($erasmus)) $erasmus=dirname(__DIR__).'/public/reimbursement/erasmus-logo.png';
        $eu=__DIR__.'/assets/eu-logo.png'; if (!is_file($eu)) $eu=dirname(__DIR__).'/public/reimbursement/eu-logo.png';
        $this->Image($eu,15,10,22,0,'PNG');
        $this->Image($ngo,42,8,16,17,'PNG');
        $this->Image($erasmus,145,10,50,0,'PNG');
        $this->SetTextColor(20,38,76);$this->SetFont('dejavusans','B',14);$this->SetXY(15,32);
        $this->MultiCell(180,6,$this->declarationTitle,0,'L',false,1);
        $this->SetFont('dejavusans','',8);$this->SetX(15);$this->MultiCell(180,5,'Internationaler Jugend- und Bildungsverein Kaiserslautern e.V.',0,'L',false,1);
        $this->SetDrawColor(20,38,76);$lineY=max(59,$this->GetY()+2);$this->Line(15,$lineY,195,$lineY);
    }
    public function Footer() {
        $this->SetY(-15);$this->SetFont('dejavusans','',6);$this->SetTextColor(89,98,115);
        $this->MultiCell(145,3,'IJBK e.V. | Ref. '.$this->reference,0,'L');
        $this->SetXY(165,-15);$this->Cell(30,4,'Page '.$this->getAliasNumPage().' of '.$this->getAliasNbPages(),0,0,'R');
    }
}
function declaration_section(DeclarationPdf $pdf, string $title): void {
    if ($pdf->GetY()>245) $pdf->AddPage();
    $pdf->writeHTML('<h3 style="color:#125d84;font-size:10pt;border-bottom:1px solid #14264c">'.h(strtoupper($title)).'</h3>',true,false,true,false,'');
}
function declaration_pairs(DeclarationPdf $pdf, array $fields): void {
    $html='<table cellpadding="4" cellspacing="0" style="font-size:9pt">';
    foreach(array_chunk($fields,2) as $row) {
        $html.='<tr nobr="true">';
        foreach($row as [$label,$value]) $html.='<td width="50%"><span style="font-size:7pt;color:#596273">'.h(strtoupper($label)).'</span><br>'.nl2br(h($value ?: 'Not recorded')).'</td>';
        if(count($row)===1)$html.='<td width="50%"></td>';
        $html.='</tr>';
    }
    $pdf->writeHTML($html.'</table>',true,false,true,false,'');
}
function generate_claim_pdf(array $claim, array $files, string $claimDir, array &$warnings=[]): string {
    foreach($files as $file) if(str_starts_with($file['key']??'', 'boarding-') && (empty($file['path']) || !is_file($file['path']) || filesize($file['path'])===0)) fail('Upload all selected boarding passes before generating the PDF.',422);
    $signaturePath=$claimDir.'/signature.jpg';
    $signatureReadable=true;
    try {
    $source=@imagecreatefromstring($claim['signatureBytes']);
    if($source===false||imagesx($source)>2000||imagesy($source)>1000)throw new RuntimeException('Invalid signature image');
    $canvas=imagecreatetruecolor(imagesx($source),imagesy($source));$white=imagecolorallocate($canvas,255,255,255);imagefill($canvas,0,0,$white);imagealphablending($canvas,true);imagecopy($canvas,$source,0,0,0,0,imagesx($source),imagesy($source));
    if(!imagejpeg($canvas,$signaturePath,90))throw new RuntimeException('Unable to save signature');chmod($signaturePath,0600);
    }catch(Throwable){$signatureReadable=false;$warnings[]=['key'=>'signature','filename'=>'Signature','message'=>'Signature could not be displayed. Manual review required.'];}
    $p=$claim['participant'];$title='Reimbursement Declaration - '.$p['name'].' - '.$p['team'];
    $pdf=new DeclarationPdf('P','mm','A4',true,'UTF-8',false);
    $pdf->declarationTitle=$title;$pdf->reference=claim_reference($claim);
    // Reserve enough header space for long international names and countries.
    $pdf->SetFont('dejavusans','B',14);
    $headerHeight=max(65,32+$pdf->getStringHeight(180,$title)+14);
    $pdf->SetMargins(15,$headerHeight,15);$pdf->SetAutoPageBreak(true,20);
    $pdf->SetTitle($title);$pdf->SetAuthor('IJBK e.V.');$pdf->SetFont('dejavusans','',9);$pdf->AddPage();
    declaration_section($pdf,'Project');
    declaration_pairs($pdf,[['Project title',$claim['projectName']],['Project number',$claim['projectCode']],['Activity start date',$claim['activityStartDate']??'Not recorded'],['Activity end date',$claim['activityEndDate']??'Not recorded'],['Destination city',$claim['destinationCity']??'Not recorded'],['Submission reference',$pdf->reference],['Submitted (UTC)',str_replace('T',' ',substr($claim['createdAt'],0,19))]]);
    declaration_section($pdf,'Participant');
    declaration_pairs($pdf,[['Full name (as in ID)',$p['name']],['Country of residence',$p['team']],['Citizenship',$p['citizenship']],['Date of birth',$p['dateOfBirth']],['Role',$p['role']??'Not recorded'],['Email',$p['email']],['Phone',$p['phone']],['Home address',$p['address']],['City of residence',$p['city']??'Not recorded'],['Arrival in destination country',$p['arrivalDate']??'Not recorded'],['Departure from destination country',$p['departureDate']??'Not recorded']]);
    declaration_section($pdf,'Bank details for the transfer');
    declaration_pairs($pdf,[['Account holder',$p['accountHolder']??'Not recorded'],['Bank name',$p['bankName']??'Not recorded'],['Account / IBAN',$p['bankAccount']],['BIC / SWIFT',$p['bic']],['Green travel',!empty($p['greenTravel'])?'Yes':'No']]);
    $pdf->AddPage();declaration_section($pdf,'Travel');
    $attachmentLinks=[];
    foreach($claim['tickets'] as $t) {
        // Keep each ticket's details together and reserve a line for its page link.
        if($pdf->GetY()>205)$pdf->AddPage();
        $widths=[4,21,12,12,15,10,13,13];
        $labels=['#','FROM / TO','PURCHASE DATE','TRAVEL DATE','TRANSPORT / FORMAT','PURCHASE CURRENCY','AMOUNT IN LOCAL CURRENCY','AMOUNT IN EUR'];
        $values=[(string)$t['serial'],flight_route($t),$t['purchaseDate'],$t['travelDate'],$t['mode'].' / '.($t['ticketType']??'Format not recorded'),$t['currency'],number_format($t['amount'],2,'.',''),number_format($t['euroCents']/100,2,'.','')];
        $html='<table cellpadding="3" cellspacing="0" style="font-size:7pt"><thead><tr style="background-color:#14264c;color:#ffffff;font-size:6.5pt">';
        foreach($labels as $i=>$label)$html.='<th width="'.$widths[$i].'%">'.h($label).'</th>';
        $html.='</tr></thead><tr nobr="true" style="background-color:#f0f4f8">';
        foreach($values as $i=>$value)$html.='<td width="'.$widths[$i].'%"'.($i>=6?' align="right"':'').'>'.h($value).'</td>';
        $pdf->writeHTML($html.'</tr></table>',true,false,true,false,'');
        $pdf->SetFont('dejavusans','',7);
        if($t['currency']!=='EUR')$pdf->MultiCell(180,4,'Exchange rate: 1 '.$t['currency'].' = '.$t['rate'].' EUR | Rate date: '.$t['rateDate'].' | '.$t['source'],0,'L',false,1);
        if($pdf->GetY()>268)$pdf->AddPage();
        $attachmentLinks[$t['serial']]=['page'=>$pdf->getPage(),'y'=>$pdf->GetY(),'link'=>$pdf->AddLink()];
        $pdf->SetY($pdf->GetY()+8);
        $pdf->SetFont('dejavusans','',9);
        foreach(($t['mode']==='Flight'?($t['boardingPasses']??[]):[]) as $j=>$pass){
            if($pdf->GetY()>245)$pdf->AddPage();
            $label=($pass['journey']==='return'?'Return':'Outbound').' boarding pass '.($j+1);
            $html='<table cellpadding="4" style="font-size:8pt"><tr nobr="true"><td width="33%">'.h($label).'</td><td width="50%">'.h(($pass['from']?:'Airport not recorded').' → '.($pass['to']?:'Airport not recorded')).'</td><td width="17%" align="right">0.00 EUR</td></tr></table>';
            $pdf->writeHTML($html,true,false,true,false,'');
            $key='boarding-'.$t['serial'].'-'.($j+1);
            $attachmentLinks[$key]=['page'=>$pdf->getPage(),'y'=>$pdf->GetY(),'link'=>$pdf->AddLink()];$pdf->SetY($pdf->GetY()+8);
        }
    }
    if($pdf->GetY()>195)$pdf->AddPage();declaration_section($pdf,'Reimbursement calculation');
    $totals=reimbursement_totals($claim);
    $pdf->writeHTML(rows_html([['Total eligible / submitted expenses',money_eur($claim['totalCents'])],['Country reimbursement limit',isset($claim['countryLimitCents'])?money_eur($claim['countryLimitCents']):'Not recorded (legacy claim)'],['Extra reimbursement (admin approved)',money_eur($totals['extraCents'])]]),true,false,true,false,'');
    $pdf->writeHTML('<div style="background-color:#e8edf5;font-size:12pt"><b>Final reimbursement amount: '.money_eur($totals['finalCents']).'</b></div>',true,false,true,false,'');
    if(!empty($p['notes'])){declaration_section($pdf,'Notes from the participant');$pdf->writeHTML('<p>'.nl2br(h($p['notes'])).'</p>',true,false,true,false,'');}
    if(str_contains($claim['declarationText']??'',"\n\n")||$pdf->GetY()>190)$pdf->AddPage();declaration_section($pdf,'Declaration and signature');
    $declaration=$claim['declarationText']??'I confirm that these details are accurate, these expenses were incurred for this project, and the uploaded tickets correspond to the listed journeys. I authorize IJBK to use these details to process my reimbursement.';
    foreach(preg_split('/\n\s*\n/',$declaration) as $index=>$point) {
        $text=h($point);
        $text=preg_replace('/^([^:]+:)/u','<b>$1</b>',$text);
        $pdf->writeHTML('<p>'.($index===0?'':$index.'. ').$text.'</p>',true,false,true,false,'');
    }
    if($pdf->GetY()>230)$pdf->AddPage();$y=$pdf->GetY();if($signatureReadable)$pdf->Image($signaturePath,15,$y,70,22,'JPEG');else{$pdf->SetTextColor(185,28,28);$pdf->MultiCell(180,6,'Signature could not be displayed. Manual review required.',0,'L',false,1);$pdf->SetTextColor(20,24,35);}$pdf->SetY($y+27);
    declaration_pairs($pdf,[['Signed by',$p['name']],['Place / date (UTC)',($p['signaturePlace']??'Place not recorded').', '.substr($claim['createdAt'],0,10)]]);
    if(!empty($p['greenTravel'])){
        $pdf->AddPage();declaration_section($pdf,'Green Travel Declaration');
        $pdf->writeHTML('<p><b>[X] I confirm that I used green means of transport for my travel related to this Erasmus+ activity.</b></p>',true,false,true,false,'');
        $pdf->writeHTML('<p>I declare that the information provided in this claim is true and accurate and that the journey declared as green travel was undertaken using eligible low-emission means of transport, such as train, bus, car-sharing or bicycle.</p>',true,false,true,false,'');
        $pdf->writeHTML('<p>I understand that I may be required to provide tickets, booking confirmations, receipts or other supporting documents as evidence of the journey and means of transport used. I understand that an incorrect or false declaration may result in the corresponding green-travel reimbursement or other related travel support being refused or recovered.</p>',true,false,true,false,'');
        $y=$pdf->GetY()+6;if($signatureReadable)$pdf->Image($signaturePath,15,$y,70,22,'JPEG');$pdf->SetY($y+27);
        declaration_pairs($pdf,[['Signed by',$p['name']],['Place / date (UTC)',($p['signaturePlace']??'Place not recorded').', '.substr($claim['createdAt'],0,10)]]);
    }
    $pdf->SetAutoPageBreak(false);
    $temporaryFiles=[];
    try {
        $documents=supporting_documents($claim);
        foreach($files as $index=>$file){
            $ticket=$documents[$index];$pdf->AddPage();
            $key=$ticket['isBoardingPass']?$ticket['key']:$ticket['serial'];
            $attachmentLinks[$key]['destination']=$pdf->getPage();
            $pdf->SetLink($attachmentLinks[$key]['link'],0,$pdf->getPage());
            $pdf->SetFont('dejavusans','B',11);$pdf->MultiCell(180,6,$ticket['label'].' / '.$ticket['mode'],0,'L',false,1);
            $pdf->SetFont('dejavusans','',8);$pdf->MultiCell(180,5,$ticket['route'].' / '.money_eur($ticket['euroCents']),0,'L',false,1);
            $pdf->MultiCell(180,5,$ticket['filename']?:'No file uploaded',0,'L',false,1);
            $y=$pdf->GetY()+4;$height=277-$y;
            // TCPDF transactions remove partial page content if one attachment fails.
            $pdf->startTransaction();
            try{
                if(!$file['path'])throw new RuntimeException('Missing document');
                if($file['type']==='application/pdf')place_ticket_pdf($pdf,$file['path'],15,$y,180,$height,$temporaryFiles);
                else place_ticket_image($pdf,$file['path'],15,$y,180,$height);
                $pdf->commitTransaction();
            }catch(Throwable $error){
                $warnings[]=['key'=>$ticket['key'],'filename'=>$ticket['filename']?:$ticket['label'],'message'=>$file['path']?'Document could not be displayed; original attached for manual review.':'Supporting document missing.'];
                $pdf->rollbackTransaction(true);$pdf->SetTextColor(185,28,28);$pdf->SetXY(15,$y);
                $pdf->MultiCell(180,6,$file['path']?'This document could not be displayed. The original file is attached for manual review. The claim was generated successfully.':'Boarding pass or supporting document missing. The claim was generated successfully.',0,'L',false,1);
                $original=$file['originalPath']??$file['path'];
                if($original&&is_file($original))$pdf->Annotation(15,$pdf->GetY()+3,8,8,'Original supporting document',['Subtype'=>'FileAttachment','FS'=>$original,'Name'=>'Paperclip']);
                $pdf->SetTextColor(20,24,35);
            }
        }
        foreach($attachmentLinks as $attachment) {
            $pdf->setPage($attachment['page']);$pdf->SetXY(15,$attachment['y']);
            $pdf->SetFont('dejavusans','',8);$pdf->SetTextColor(13,94,166);
            $pdf->Cell(180,5,'Attachment on page '.$attachment['destination'].' - go to page',0,1,'L',false,$attachment['link']);
        }
        $pdf->lastPage();
        return $pdf->Output('','S');
    } finally {
        foreach($temporaryFiles as $temporaryFile) @unlink($temporaryFile);
    }
}

function generate_organisation_declaration_pdf(array $data): string {
    $pdf=new DeclarationPdf('P','mm','A4',true,'UTF-8',false);
    $pdf->declarationTitle='Reimbursement Declaration';$pdf->reference=$data['projectCode'].' | '.$data['country'];
    $pdf->SetMargins(15,65,15);$pdf->SetAutoPageBreak(false);$pdf->SetTitle('Reimbursement Declaration - '.$data['organisationName'].' - '.$data['country']);$pdf->SetAuthor('IJBK e.V.');$pdf->SetFont('dejavusans','',8);$pdf->AddPage();
    declaration_section($pdf,'Project and organisation');
    declaration_pairs($pdf,[['Project',$data['projectName']],['Project code',$data['projectCode']],['Destination',$data['destinationCity']],['Activity dates',$data['activityStartDate'].' to '.$data['activityEndDate']],['Organisation',$data['organisationName']],['Country',$data['country']]]);
    declaration_section($pdf,'Participants and reimbursement');
    $html='<table border="1" cellpadding="3" cellspacing="0" style="font-size:8pt;border-color:#aeb9c9"><thead><tr style="background-color:#14264c;color:#ffffff"><th width="18%">ROLE</th><th width="52%">NAME</th><th width="30%" align="right">REIMBURSEMENT TO BE PAID</th></tr></thead><tbody>';
    foreach($data['participants'] as $index=>$person)$html.='<tr nobr="true" style="background-color:'.($index%2?'#f7f9fc':'#ffffff').'"><td width="18%">'.h($person['label']).'</td><td width="52%">'.h($person['name']).'</td><td width="30%" align="right">'.h(money_eur($person['reimbursementCents'])).'</td></tr>';
    $html.='<tr style="background-color:#e8edf5;font-size:9pt"><td width="70%" colspan="2"><b>TOTAL REIMBURSEMENT TO BE PAID BY BANK TRANSFER</b></td><td width="30%" align="right"><b>'.h(money_eur($data['totalCents'])).'</b></td></tr></tbody></table>';
    $pdf->writeHTML($html,true,false,true,false,'');
    declaration_section($pdf,'Declaration');
    $declaration='I declare that a payment of '.money_eur($data['totalCents']).' will be paid by bank transfer to the bank account below after the required participant reporting has been completed and all original travel documents for the EU project '.$data['projectName'].' ('.$data['projectCode'].') held in '.$data['destinationCity'].', between '.$data['activityStartDate'].' and '.$data['activityEndDate'].', have been delivered and checked.';
    $pdf->writeHTML('<p>'.h($declaration).'</p>',true,false,true,false,'');
    $submitterRole=$data['submitterRole']??'sending-organisation-member';$submitterName=$data['submitterName']??$data['legalRepresentativeName'];
    $role=$submitterRole==='team-leader'?'Team leader':'Member of the sending organisation';
    declaration_pairs($pdf,[['Submitted by',$role],['Name',$submitterName]]);
    if($submitterRole==='sending-organisation-member')declaration_pairs($pdf,[['Position',$data['submitterPosition']??'Not recorded'],['Contact',$data['submitterPhone']??'Not recorded'],['Email',$data['submitterEmail']??'Not recorded'],['Date and place',$data['signatureDate'].', '.$data['signaturePlace']]]);
    else declaration_pairs($pdf,[['Contact',$data['submitterPhone']],['Email',$data['submitterEmail']],['Date and place',$data['signatureDate'].', '.$data['signaturePlace']]]);
    $signaturePath=tempnam(sys_get_temp_dir(),'ijbk-org-signature-');
    try {
        $pdf->Cell(0,5,'Signature of the '.($submitterRole==='team-leader'?'team leader':'sending organisation member').' - '.$submitterName,0,1,'L');
        file_put_contents($signaturePath,base64_decode(substr($data['signature'],22),true));$y=$pdf->GetY();$pdf->Image($signaturePath,15,$y,58,16,'PNG');$pdf->SetY($y+19);
        declaration_section($pdf,'Bank details');
        declaration_pairs($pdf,[['Account holder',$data['accountHolder']],['IBAN',$data['iban']],['Bank country',$data['bankCountry']],['SWIFT / BIC',$data['swift']]]);
        return $pdf->Output('','S');
    } finally { if(is_file($signaturePath))@unlink($signaturePath); }
}

function generate_partnership_agreement_pdf(array $d): string {
    $pdf=new DeclarationPdf('P','mm','A4',true,'UTF-8',false);$pdf->declarationTitle='Partnership Agreement';$pdf->reference=$d['projectCode'].' | '.$d['partnerCountry'];$pdf->SetMargins(15,65,15);$pdf->SetAutoPageBreak(true,18);$pdf->SetTitle('Partnership Agreement - '.$d['partnerName']);$pdf->SetAuthor('IJBK e.V.');$pdf->SetFont('dejavusans','',9);$pdf->AddPage();
    $coordinator='Internationaler Jugend- und Bildungsverein Kaiserslautern e.V. (IJBK e.V.)';
    $identity='<h1 style="text-align:center;color:#063d61">PARTNERSHIP AGREEMENT</h1><p style="text-align:center"><b>Erasmus+ KA152-YOU - '.h($d['projectName']).'</b></p><table cellpadding="5"><tr style="background-color:#d1e6f2"><td width="38%"><b>Coordinator</b></td><td width="62%">'.h($coordinator).'</td></tr><tr><td><b>OID / Country</b></td><td>E10404746 / Germany</td></tr><tr style="background-color:#d1e6f2"><td><b>Coordinator signatory</b></td><td>Vidit Goyal, Chairman</td></tr><tr><td><b>Partner</b></td><td>'.h($d['partnerName'].', OID '.$d['partnerOid'].', '.strtoupper($d['partnerCountry'])).'</td></tr><tr style="background-color:#d1e6f2"><td><b>Partner signatory</b></td><td>'.h($d['legalRepresentativeName'].', '.$d['legalRepresentativePosition']).'</td></tr></table><p>The Coordinator and the Partner are each a “Party” and together the “Parties”. The Parties agree as follows:</p>';
    $pdf->writeHTML($identity,true,false,true,false,'');
    $sections=[
      'Article 1 - Purpose and governing documents'=>'1.1. This Agreement defines the Parties’ responsibilities for the preparation, implementation, financing, safety, reporting and follow-up of the Project.<br>1.2. The Project shall be implemented in accordance with the Grant Agreement and its annexes, the approved application and budget, any mandate or accession form, applicable Erasmus+ rules and quality standards, and this Agreement. In case of conflict, the Grant Agreement and mandatory law prevail.<br>1.3. This Agreement does not create an entitlement to any amount that is not accepted or paid by the German National Agency.',
      'Article 2 - Duration'=>'2.1. This Agreement enters into force on the date of the last signature and, where legally permitted, applies from the start of the Project eligibility period.<br>2.2. It remains effective until all Project tasks, payments, reports, audits, recoveries, confidentiality and data-protection obligations have been completed.',
      'Article 3 - Roles and responsibilities'=>'3.1. Each Party shall perform its assigned tasks lawfully, professionally, on time and in accordance with the approved Project plan. Each Party remains responsible for its own acts and omissions and for the persons engaged by it.<br>3.2. The Coordinator is responsible for overall coordination, communication with the National Agency, consolidated reporting, verification of partner documentation, financial administration and transfer of Project funds subject to this Agreement and the Grant Agreement.<br>3.3. The Partner is responsible for its national group and assigned tasks, including:<br>• (a) selecting eligible participants and a competent adult group leader in accordance with the approved profile;<br>• (b) preparing participants, supporting travel arrangements and providing programme, safety, emergency, reimbursement and Code of Conduct information before departure;<br>• (c) checking identity, residence, eligibility and required insurance or health-cover documents;<br>• (d) supporting participants throughout the Project, collecting required evidence and contributing to evaluation, dissemination and follow-up; and<br>• (e) providing complete and accurate information and documents by the deadlines communicated by the Coordinator.<br>3.4. If the Partner does not select and confirm the required number of eligible participants by the deadline communicated in writing, the Coordinator may, in coordination with the Partner, assist with or complete the selection and confirm suitable participants for the Partner’s national group. The Partner shall reasonably cooperate and provide the information and documents required to verify eligibility. This does not release the Partner from its remaining obligations unless otherwise agreed in writing.<br>3.5. The Partner shall immediately inform the Coordinator of any delay, participant withdrawal, legal or financial risk, safeguarding concern, conflict of interest, suspected fraud, serious complaint or other circumstance that could materially affect the Project.',
      'Article 4 - Participant safety, conduct and incidents'=>'4.1. The Parties shall cooperate in risk assessment and take reasonable and proportionate measures to provide a safe, respectful and non-discriminatory environment. The Coordinator or host addresses risks under its control at the venue and in the common programme; the Partner addresses risks connected with its participant selection, preparation, travel arrangements, national group and group leadership.<br>4.2. The Partner shall ensure that its participants and group leader receive and follow the Project Code of Conduct and reasonable safety and emergency instructions. The group leader shall remain reasonably available, monitor wellbeing and conduct, and cooperate with the Coordinator and host team.<br>4.3. Participants remain personally responsible for intentional, illegal, reckless or clearly prohibited conduct. A participant who seriously endangers themselves or others, harasses others, damages property, uses illegal substances, carries prohibited items or repeatedly ignores safety instructions may be removed from an activity or required to leave the Project, subject to proportionality, safeguarding needs and applicable law.<br>4.4. Serious injury, hospitalisation, police involvement, a missing person, safeguarding allegation, major property damage or death must be reported to the Coordinator immediately. The Parties shall prioritise protection of life and health, contact emergency services where necessary, document the facts and cooperate with insurers, authorities, the National Agency and affected families as legally appropriate.',
      'Article 5 - Liability and indemnification'=>'5.1. No Party is liable merely because an incident occurred. Responsibility shall be determined by applicable law, the Party’s duties, causation, fault and the circumstances of the case.<br>5.2. To the maximum extent permitted by law, the Coordinator is not responsible for loss, injury, death, damage, fines or claims caused solely by a participant’s intentional, illegal, reckless or clearly prohibited conduct; refusal to follow reasonable safety instructions; risks outside the Coordinator’s reasonable control; or the Partner’s breach of its selection, preparation, supervision, insurance, reporting or safeguarding duties.<br>5.3. Nothing in this Agreement excludes or limits liability that cannot legally be excluded, including liability for a Party’s own intentional misconduct and other mandatory liability. Each Party remains responsible for direct loss caused by its own breach, negligence or intentional act or omission.<br>5.4. The Partner shall indemnify the Coordinator against third-party claims, grant recoveries, penalties and reasonable external costs to the extent caused by the Partner’s breach, false or incomplete information, ineligible participant selection, failure to prepare or support its national group, misuse of funds, or acts or omissions of persons for whom the Partner is legally responsible. This does not apply to the extent the matter was caused by the Coordinator’s own breach, negligence or intentional misconduct.',
      'Article 6 - Payments, reimbursement and bank account'=>'6.1. Project payments are conditional on the availability of grant funds, satisfactory completion of assigned tasks and timely submission of complete and credible supporting documents. The Coordinator may deduct expenditure paid on the Partner’s behalf where agreed or properly documented.<br>6.2. The Partner designates the following account to receive Partner funds including participant travel reimbursement:<br><br><table border="1" cellpadding="3"><tr><td>Name of the account holder (Partner organisation):</td><td>'.h($d['accountHolder']).'</td></tr><tr><td>Bank name:</td><td>'.h($d['bankName']).'</td></tr><tr><td>Address of the bank:</td><td>'.h($d['bankAddress']).'</td></tr><tr><td>IBAN:</td><td>'.h($d['iban']).'</td></tr><tr><td>SWIFT:</td><td>'.h($d['swift']).'</td></tr><tr><td>Currency</td><td>'.h($d['bankCurrency']??'EUR').'</td></tr></table><br>6.3. Payment by the Coordinator to the verified account above constitutes valid payment and discharges the Coordinator for that amount. The Partner is responsible for correct and timely onward reimbursement to its participants and group leader and shall provide proof of payment on request.<br>6.4. Unless otherwise agreed in writing, onward reimbursement shall be completed within ten business days after the Partner receives the relevant funds. The Partner shall not make unauthorised deductions, participation charges or unrelated set-offs from participant reimbursements.<br>6.5. Any change of bank account must be notified by an authorised representative and independently verified by the Coordinator. The Coordinator may suspend, withhold, reduce or set off payment where documentation is missing, tasks are incomplete, eligibility is doubtful, funds may have been misused, or a grant recovery is reasonably expected.<br>6.6. The Partner shall repay within thirty days any amount rejected or recovered by the National Agency to the extent attributable to the Partner, its participants, staff or group leader, including amounts resulting from false information, ineligible participation, missing evidence or misuse of funds.',
      'Article 7 - Reporting, records, visibility and data protection'=>'7.1. The Partner shall provide accurate information and all documents reasonably required for Project reporting, audits, participant evidence and grant calculations by the deadlines set by the Coordinator, and shall retain legally valid records for the period required by the Grant Agreement and applicable law.<br>7.2. The Parties shall support evaluation and dissemination and shall use the required Erasmus+ and EU visibility statements and visual identity. Public communication must be accurate and respect confidentiality, safeguarding and consent requirements.<br>7.3. Each Party shall process personal data lawfully and securely for legitimate Project purposes. Medical, safeguarding, incident and bank information shall be shared only with authorised persons who need it for lawful Project duties. Confidentiality continues after the Project ends.',
      'Article 8 - Communication, changes and conflict of interest'=>'8.1. Each Party shall appoint a Project Contact and an Emergency or Safeguarding Contact (which can be identical). Day-to-day coordination may take place through agreed messaging tools, but formal approvals, financial instructions, bank changes, warnings, suspension and termination notices must be confirmed by email.<br><br><table border="1" cellpadding="3"><tr style="background-color:#d1e6f2"><td>Contact</td><td>Coordinator</td><td>Partner</td></tr><tr><td>Project Contact</td><td>Vidit Goyal<br>vidit@ijbk-de.org<br>+49 157 58060612</td><td>'.h($d['contactName']).'<br>'.h($d['contactEmail']).'<br>'.h($d['contactPhone']).'</td></tr><tr><td>Emergency / Safeguarding</td><td>Same as above</td><td>'.h($d['contactName']).'<br>'.h($d['contactEmail']).'<br>'.h($d['contactPhone']).'</td></tr></table><br>8.2. No material change to participants, dates, activities, travel arrangements, responsibilities or use of funds may be made without prior written agreement where the change affects eligibility, safety, quality or reporting.<br>8.3. The Parties shall avoid conflicts of interest and immediately disclose any situation that could affect impartial implementation. Suspected fraud, corruption, theft, double funding or fabricated evidence must be reported without undue delay.',
      'Article 9 - Suspension and termination'=>'9.1. The Coordinator may suspend a payment, activity or participant where reasonably necessary to protect participants, Project quality, grant compliance, evidence or funds. Where appropriate, the Partner shall be given a reasonable period to remedy the issue.<br>9.2. Either Party may terminate this Agreement for a material breach that is not remedied within a reasonable written deadline. The Coordinator may terminate immediately in cases of fraud, serious safeguarding failure, violence, deliberate misuse of funds, false declarations, loss of eligibility or conduct creating a serious risk to participants or the Project.<br>9.3. Termination does not affect existing repayment, reporting, audit, confidentiality, data-protection, liability or indemnification obligations. The Partner shall return unspent or unsupported funds and provide all outstanding Project documents.',
      'Article 10 - Force majeure, disputes and applicable law'=>'10.1. A Party is not in breach to the extent performance is prevented by an unforeseeable and unavoidable event beyond its reasonable control, provided it promptly informs the other Party and takes reasonable steps to reduce the impact. Financial eligibility remains subject to the Grant Agreement and the National Agency’s decision.<br>10.2. The Parties shall first attempt to resolve disputes through good-faith written consultation between their authorised representatives. If no solution is reached within fifteen business days, the matter shall be escalated to their legal representatives or governing bodies.<br>10.3. This Agreement is governed by German law to the extent permitted by mandatory law. Where legally permissible, the courts competent for the Coordinator’s registered office shall have jurisdiction.',
      'Article 11 - Final provisions'=>'11.1. Amendments must be made in writing and approved by authorised representatives of both Parties. If any provision is invalid or unenforceable, the remaining provisions remain effective and the Parties shall replace the affected provision with a lawful provision closest to its intended purpose.<br>11.2. Electronic signatures and counterparts are permitted where legally valid. The working language is English.'
    ];foreach($sections as $title=>$body){if($title==='Article 10 - Force majeure, disputes and applicable law')$pdf->AddPage();declaration_section($pdf,$title);$pdf->writeHTML('<p>'.$body.'</p>',true,false,true,false,'');}
    declaration_section($pdf,'Signatures');declaration_pairs($pdf,[['For the Coordinator','IJBK e.V.'],['For the Partner',$d['partnerName']],['Name','Vidit Goyal'],['Name',$d['legalRepresentativeName']],['Position','Chairman'],['Position',$d['legalRepresentativePosition']],['Place and date','Kaiserslautern, Germany, 7 September 2026'],['Place and date',$d['signaturePlace'].', '.$d['signatureDate']]]);
    $signaturePath=tempnam(sys_get_temp_dir(),'ijbk-partner-signature-');try{file_put_contents($signaturePath,base64_decode(substr($d['signature'],22),true));$signatureY=$pdf->GetY();$coordinatorSignature=__DIR__.'/assets/coordinator-signature.png';if(is_file($coordinatorSignature))$pdf->Image($coordinatorSignature,25,$signatureY,68,27,'PNG');$pdf->SetXY(105,$signatureY);$pdf->Cell(0,5,'Signature for the Partner',0,1,'L');$pdf->Image($signaturePath,105,$pdf->GetY(),58,16,'PNG');return $pdf->Output('','S');}finally{if(is_file($signaturePath))@unlink($signaturePath);}
}
