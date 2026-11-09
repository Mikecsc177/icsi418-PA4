import { useState, useEffect } from "react";

function ProjectMembers() {
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [members, setMembers] = useState([]);
  const [userToAdd, setUserToAdd] = useState("");
  const [message, setMessage] = useState("");

  //loads the project data (load data)
  useEffect(() => {
    async function loadData() {
      try {
        const projectResponse = await fetch("http://localhost:9000/projects");
        const projectData = await projectResponse.json();
        const userResponse = await fetch("http://localhost:9000/users");
        const userData = await userResponse.json();

        if (projectResponse.ok && userResponse.ok) {
          setProjects(projectData);
          setUsers(userData);
        } else {
          setMessage("Could not load projects or users");
        }
      } catch (error) {
        setMessage("Could not connect to the server");
      }
    }
    loadData();
  }, []);

  //gets the member list for one project (load members)
  async function loadMembers(projectId) {
    if (!projectId) {
      setMembers([]);
      return;
    }

    try {
      //get for project members
      const response = await fetch(`http://localhost:9000/projects/${projectId}/members`);
      const data = await response.json();
      if (response.ok) {
        setMembers(data);
      } else {
        setMembers([]);
        setMessage(data.message || "Could not load members");
      }
    } catch (error) {
      setMessage("Could not connect to the server");
    }
  }
//member add
  function handleProjectChange(event) {
    const projectId = event.target.value;
    setSelectedProjectId(projectId);
    setUserToAdd("");
    setMessage("");
    loadMembers(projectId);
  }
//handles adding members
  async function handleAddMember(event) {
    event.preventDefault();

    if (!selectedProjectId || !userToAdd) {
      setMessage("Select a project and a user first");
      return;
    }
    //POST to add members
    try {
      const response = await fetch(`http://localhost:9000/projects/${selectedProjectId}/members`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ user_id: userToAdd })
      });

      //server messages confirming member added or if member added failed
      const data = await response.json();

      if (response.ok) {
        setMessage(data.message || "Member added successfully");
        setUserToAdd("");
      } else {
        setMessage(data.message || "Could not add member");
      }

      //ask the server for the current list so the page matches the database (RELOAD LIST)
      loadMembers(selectedProjectId);
    } catch (error) {
      setMessage("Could not connect to the server");
    }
  }
//DELETE to remove a member
  async function handleRemoveMember(userId) {
    try {
      const response = await fetch(
        `http://localhost:9000/projects/${selectedProjectId}/members/${userId}`,
        { method: "DELETE" }
      );
      const data = await response.json();

      //handles member removal
      if (response.ok) {
        setMessage(data.message || "Member removed successfully");
      } else {
        setMessage(data.message || "Could not remove member");
      }
        //RELOAD list
      loadMembers(selectedProjectId);
    } catch (error) {
      setMessage("Could not connect to the server");
    }
  }

  return (
    <div>
      <h2>Project Members</h2>

      <select value={selectedProjectId} onChange={handleProjectChange}>
        <option value="">Select a project</option>
        {projects.map((project) => (
          <option key={project._id} value={project._id}>
            {project.name}
          </option>
        ))}
      </select>

      {selectedProjectId && (
        <div>
          <h3>Members</h3>

              
          {members.length === 0 && <p>No members yet.</p>}
          <ul>
            {members.map((member) => (
              <li key={member.membership_id}>
                {member.f_name} {member.l_name} ({member.username})
                {member.is_lead ? (
                  <span> - Project lead</span>
                ) : (
                  <button onClick={() => handleRemoveMember(member.user_id)}>Remove</button>
                )}
              </li>
            ))}
          </ul>

          <form onSubmit={handleAddMember}>
            <select value={userToAdd} onChange={(event) => setUserToAdd(event.target.value)}>
              <option value="">Select a user to add</option>
              {users.map((user) => (
                <option key={user._id} value={user._id}>
                  {user.f_name} {user.l_name} ({user.username})
                </option>
              ))}
            </select>
            <button type="submit">Add Member</button>
          </form>
        </div>
      )}

      {message && <p>{message}</p>}
    </div>
  );
}

export default ProjectMembers;
