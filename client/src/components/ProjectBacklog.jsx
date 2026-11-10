import { useState, useEffect } from "react";
 
const API = "http://localhost:9000";
const PRIORITIES = ["High", "Medium", "Low"];
const STATUSES = ["To Do", "In Progress", "Done"];
 
const emptyForm = { title: "", description: "", priority: "", status: "To Do", assigned_user_id: "" };  


//name for assigned member 
function assigneeName(story) {
  if (!story.assigned_user_id) return "Unassigned";
  const name = `${story.assigned_f_name || ""} ${story.assigned_l_name || ""}`.trim();
  return name || story.assigned_username || "Unknown user";
}

function ProjectBacklog() {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [members, setMembers] = useState([]);
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(false);

//story details, create and edit form
 const [detailsId, setDetailsId] = useState(null);
  const [createForm, setCreateForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(emptyForm);
 
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");


//load project list once
useEffect(() => {
    async function loadProjects() {
      try {
        const response = await fetch(`${API}/projects`);
        const data = await response.json();
        if (response.ok) {
          setProjects(data);
        } else {
          setError(data.message || "Could not load projects");
        }
      } catch {
        setError("Could not connect to the server");
      }
    }
    loadProjects();
  }, []);


  //load members and stories when the project is selected
    useEffect(() => {
    if (!selectedProjectId) return;
    let cancelled = false;
 
    async function loadProjectData() {
      setLoading(true);
      try {
        const [memberResponse, storyResponse] = await Promise.all([
          fetch(`${API}/projects/${selectedProjectId}/members`),
          fetch(`${API}/projects/${selectedProjectId}/stories`)
        ]);
        const memberData = await memberResponse.json();
        const storyData = await storyResponse.json();
        if (cancelled) return;
 
        if (memberResponse.ok && storyResponse.ok) {
          setMembers(memberData);
          setStories(storyData);
        } else {
          setError(memberData.message || storyData.message || "Could not load the backlog");
        }
      } catch {
        if (!cancelled) setError("Could not connect to the server");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadProjectData();
 
    return () => {
      cancelled = true;
    };
  }, [selectedProjectId]);
 

  //reload after create, edit, delete to update screen for database
   async function refreshStories() {
    const response = await fetch(`${API}/projects/${selectedProjectId}/stories`);
    const data = await response.json();
    if (response.ok) {
      setStories(data);
    } else {
      setError(data.message || "Could not reload stories");
    }
  }
  function handleProjectChange(event) {

        setSelectedProjectId(event.target.value);
    setMembers([]);
    setStories([]);
    setDetailsId(null);
    setEditingId(null);
    setEditForm(emptyForm);
    setCreateForm(emptyForm);
    setMessage("");
    setError("");
  }
   function buildBody(form, includeStatus) {
    const body = {
      title: form.title,
      description: form.description,
      priority: form.priority,
      assigned_user_id: form.assigned_user_id === "" ? null : form.assigned_user_id
    };
    if (includeStatus) body.status = form.status;
    return body;
  }

  //frontend check 
 function checkForm(form) {
    if (!form.title.trim()) return "Title is required";
    if (!form.description.trim()) return "Description is required";
    if (!form.priority) return "Priority is required";
    return "";
  }
 
  async function handleCreate(event) {
    event.preventDefault();
    setMessage("");
    setError("");
 
    const problem = checkForm(createForm);
    if (problem) {
      setError(problem);
      return;
    }
 
    try {
      const response = await fetch(`${API}/projects/${selectedProjectId}/stories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildBody(createForm, false))
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not create story");
 
      setMessage(data.message || "Story created successfully");
      setCreateForm(emptyForm);
      await refreshStories();
    } catch (err) {
      setError(err.message || "Could not connect to the server");
    }
  }
 //form state
  function startEdit(story) {
    setMessage("");
    setError("");
    setEditingId(story._id);

     setEditForm({
      title: story.title,
      description: story.description,
      priority: story.priority,
      status: story.status,
      assigned_user_id: story.assigned_user_id || ""
    });
  }

    function cancelEdit() {
    setEditingId(null);
    setEditForm(emptyForm);
    setError("");
  }
 
  async function handleSave(event) {
    event.preventDefault();
    setMessage("");
    setError("");
 
    const problem = checkForm(editForm);
    if (problem) {
      setError(problem);
      return;
    }

 try {
      const response = await fetch(`${API}/projects/${selectedProjectId}/stories/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildBody(editForm, true))
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not save story");
 
      setMessage(data.message || "Story updated successfully");
      setEditingId(null);
      setEditForm(emptyForm);
      await refreshStories();
    } catch (err) {
      setError(err.message || "Could not connect to the server");
    }
  }
 
  async function handleDelete(story) {
    setMessage("");
    setError("");

if (!window.confirm(`Delete the story "${story.title}"?`)) return;

 try {
      const response = await fetch(`${API}/projects/${selectedProjectId}/stories/${story._id}`, {
        method: "DELETE"
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not delete story");
 
      setMessage(data.message || "Story deleted successfully");

      //close details/edit if they were showing the deleted story
      if (detailsId === story._id) setDetailsId(null);
      if (editingId === story._id) cancelEdit();
      await refreshStories();
    } catch (err) {
      setError(err.message || "Could not connect to the server");
    }
  }
 
  //form for creating and editing 
  function renderForm(form, setForm, onSubmit, submitLabel, showStatus, onCancel) {
    return (
      <form onSubmit={onSubmit}>
        <div>
          <input
            type="text"
            placeholder="Title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </div>
        <div>
          <textarea
            rows={3}
            cols={50}
            placeholder="As a [type of user], I want [goal], so that [benefit]."
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
        <div>
          <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
            <option value="">Select priority</option>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
 
          {showStatus && (
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          )}
 
          <select
            value={form.assigned_user_id}
            onChange={(e) => setForm({ ...form, assigned_user_id: e.target.value })}
          >
            <option value="">Unassigned</option>
            {members.map((m) => (
              <option key={m.user_id} value={m.user_id}>
                {m.f_name} {m.l_name} ({m.username})
              </option>
            ))}
          </select>
        </div>
        <button type="submit">{submitLabel}</button>
        {onCancel && <button type="button" onClick={onCancel}>Cancel</button>}
      </form>
    );
  }
 
  return (
    <div>
      <h2>Project Backlog</h2>
 
      <select value={selectedProjectId} onChange={handleProjectChange}>
        <option value="">Select a project</option>
        {projects.map((project) => (
          <option key={project._id} value={project._id}>{project.name}</option>
        ))}
      </select>
 
      {error && <p style={{ color: "red" }}>{error}</p>}
      {message && <p style={{ color: "green" }}>{message}</p>}
 
      {!selectedProjectId && <p>Select a project to see its backlog.</p>}
 
      {selectedProjectId && (
        <div>
          <h3>Add a Story</h3>
          {renderForm(createForm, setCreateForm, handleCreate, "Create Story", false, null)}
 
          <h3>Stories</h3>
          {loading && <p>Loading...</p>}
          {!loading && stories.length === 0 && <p>This project has no stories yet. Add one above.</p>}
 
          {stories.map((story) => (
            <div key={story._id} style={{ border: "1px solid #999", padding: "8px", margin: "8px 0" }}>
              {editingId === story._id ? (
                <div>
                  <h4>Edit Story</h4>
                  {renderForm(editForm, setEditForm, handleSave, "Save", true, cancelEdit)}
                </div>
              ) : (
                <div>
                  <h4>{story.title}</h4>
                  <p>
                    Priority: {story.priority} | Status: {story.status} | Assigned: {assigneeName(story)}
                  </p>
                  {detailsId === story._id && <p>{story.description}</p>}
                  <button onClick={() => setDetailsId(detailsId === story._id ? null : story._id)}>
                    {detailsId === story._id ? "Hide Details" : "View Details"}
                  </button>
                  <button onClick={() => startEdit(story)}>Edit</button>
                  <button onClick={() => handleDelete(story)}>Delete</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
 
export default ProjectBacklog;

