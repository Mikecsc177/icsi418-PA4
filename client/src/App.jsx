import { useState } from 'react';
import Signup from './components/Signup';
import Login from './components/Login';
import CreateProject from './components/CreateProject';
import ProjectList from './components/ProjectList';
import ProjectMembers from './components/ProjectMembers';
import ProjectBacklog from './components/ProjectBacklog';

function App() {
  //which screen is showing
  const [view, setView] = useState("account");

  return (
    <div>
      <nav>
        <button onClick={() => setView("account")}>Sign Up / Login</button>
        <button onClick={() => setView("create")}>Create Project</button>
        <button onClick={() => setView("projects")}>Projects</button>
        <button onClick={() => setView("members")}>Project Members</button>
        <button onClick={() => setView("backlog")}>Backlog</button>
      </nav>
      <hr />

      {view === "account" && (
        <div>
          <Signup />
          <hr />
          <Login />
        </div>
      )}
      {view === "create" && <CreateProject />}
      {view === "projects" && <ProjectList />}
      {view === "members" && <ProjectMembers />}
      {view === "backlog" && <ProjectBacklog />}
    </div>
  );
}

export default App;

