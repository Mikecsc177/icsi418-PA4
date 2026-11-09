import { useState, useEffect } from "react";

function ProjectList() {
  const [projects, setProjects] = useState([]);
  const [message, setMessage] = useState("");

  //load the projects when this screen opens
  useEffect(() => {
    async function loadProjects() {
      try {
        const response = await fetch("http://localhost:9000/projects");
        const data = await response.json();
        if (response.ok) {
          setProjects(data);
        } else {
          setMessage(data.message || "Could not load projects");
        }
      } catch (error) {
        setMessage("Could not connect to the server");
      }
    }
    loadProjects();
  }, []);

  return (
    <div>
      <h2>Projects</h2>

      {message && <p>{message}</p>}

      {!message && projects.length === 0 && <p>No projects yet. Create one to get started.</p>}

      {projects.map((project) => (
        <div key={project._id}>
          <h3>{project.name}</h3>
          <p>{project.description}</p>
          <p>Status: {project.status}</p>
          <p>
            Project lead:{" "}
            {project.lead_username
              ? `${project.lead_f_name || ""} ${project.lead_l_name || ""} (${project.lead_username})`
              : "Unknown"}
          </p>
        </div>
      ))}
    </div>
  );
}

export default ProjectList;
