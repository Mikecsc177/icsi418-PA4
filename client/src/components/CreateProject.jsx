import { useState, useEffect } from "react";

function CreateProject() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("Planning");
  const [projectLeadId, setProjectLeadId] = useState("");
  const [users, setUsers] = useState([]);
  const [message, setMessage] = useState("");

  //load registered users for the project lead dropdown
  useEffect(() => {
    async function loadUsers() {
      try {
        const response = await fetch("http://localhost:9000/users");
        const data = await response.json();
        if (response.ok) {
          setUsers(data);
        } else {
          setMessage(data.message || "Could not load users");
        }
      } catch (error) {
        setMessage("Could not connect to the server");
      }
    }
    loadUsers();
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();

    //quick check before sending to the server
    if (!name.trim() || !description.trim() || !projectLeadId) {
      setMessage("Please fill in all fields");
      return;
    }

    try {
        //posts to projects with data as JSON (POST PROJECTS)
      const response = await fetch("http://localhost:9000/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: name,
          description: description,
          status: status,
          project_lead_id: projectLeadId
        })


      });
      const data = await response.json();

      if (response.ok) {
        //successful, clear the form
        setMessage(data.message || "Project created successfully");
        setName("");
        setDescription("");
        setStatus("Planning");
        setProjectLeadId("");
      } else {
        //failed
        setMessage(data.message || "Could not create project");
      }
    } catch (error) {
      setMessage("Could not connect to the server");
    }
  }

  return (
    <div>
      <h2>Create Project</h2>

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Project Name"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />

        <textarea
          placeholder="Description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />

        <select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="Planning">Planning</option>
          <option value="Active">Active</option>
          <option value="Completed">Completed</option>
        </select>

        <select value={projectLeadId} onChange={(event) => setProjectLeadId(event.target.value)}>
          <option value="">Select a project lead</option>
          {users.map((user) => (
            <option key={user._id} value={user._id}>
              {user.f_name} {user.l_name} ({user.username})
            </option>
          ))}
        </select>

        <button type="submit">Create Project</button>
      </form>

      {message && <p>{message}</p>}
    </div>
  );
}

export default CreateProject;
