import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import './ProjectMaterials.css';

export default function ProjectMaterials() {
  useEffect(() => {
    const previous = document.title;
    document.title = 'Project Materials · IJBK';
    return () => { document.title = previous; };
  }, []);
  return <main className="project-materials-page"><div className="eyebrow"><span className="dot"></span>THE IJBK TOOLBOX</div><h1>Useful tools.<br /><span className="serif">All in one place.</span></h1><p>A collection of activities, planners, and practical resources for projects and everyday work.</p><section className="hero"><a className="room" href="/secret-friend/"><div className="section-head"><span className="room-icon">◎</span><span className="pill live">GROUP ACTIVITY</span></div><h2>Secret Friend HQ</h2><p>A classified friendship mission. Join your project room, discover your secret friend, and go undercover with a little everyday kindness.</p><div className="meta"><span>◷ 2–3 MINUTES</span><span>AGES 18+</span></div><div className="room-foot"><span>Enter Secret Friend HQ</span><span>↗</span></div></a><div className="art" aria-hidden="true"><div className="dossier"><span className="stamp">TOP SECRET</span><div className="silhouette">?</div><strong>Kindness is the mission.</strong><small>SECRET FRIEND HQ</small></div></div></section><section className="hero planner-hero"><div className="art planner-art" aria-hidden="true"><div className="dossier planner-dossier"><span className="stamp">MISSION CONTROL</span><div className="mini-matrix"><span>DO FIRST<b>✓</b></span><span>SCHEDULE<b>◷</b></span><span>DELEGATE<b>↗</b></span><span>RECONSIDER<b>−</b></span></div><strong>Make time for what matters.</strong><small>DEADLINE &amp; PRIORITY PLANNER</small></div></div><Link className="room" to="/project-materials/deadline-planner"><div className="section-head"><span className="room-icon">◷</span><span className="pill">ADMIN ONLY</span></div><h2>Deadline &amp; Priority Planner</h2><p>Make room for what matters. Add tasks and deadlines, then organize your next steps with the Eisenhower Matrix.</p><div className="meta"><span>FOUR CLEAR PRIORITIES</span><span>PRIVATE ADMIN TOOL</span></div><div className="room-foot"><span>Open deadline planner</span><span>↗</span></div></Link></section></main>;
}
