const express = require("express");
const cors = require("cors");
require('dotenv').config(); 

const { MongoClient, ObjectId } = require("mongodb");
const client = new MongoClient(process.env.MONGO_URI);

//databases mongo
const db = client.db("pa2");
const users = db.collection("users");
const projects = db.collection("projects");
const memberships = db.collection("projectmemberships");
const stories = db.collection("userstories");

const app = express();

async function connectDatabase() {
    try {
        await client.connect();
        console.log("Connected to MongoDB");

        //make sure a user is only in a project once
        await memberships.createIndex({ project_id: 1, user_id: 1 }, { unique: true });
    } catch (error) {
        console.error("Could not connect to MongoDB");
        console.error(error);
    }
}

connectDatabase();

app.use(express.json());
app.use(cors());

//converts a string into an object id
function toObjectId(id) {
  if (typeof id === "string" && /^[a-f\d]{24}$/i.test(id)) {
    return new ObjectId(id);
  }
  return null;
}

const VALID_STATUSES = ["Planning", "Active", "Completed"];
const STORY_PRIORITIES = ["High", "Medium", "Low"];
const STORY_STATUSES = ["To Do", "In Progress", "Done"];



//catch for story fields and returns 
//
function validateStoryFields(body, requireStatus) {
  const { title, description, priority, status } = body || {};
 
  if (typeof title !== "string" || !title.trim()) {
    return { error: "Title is required" };
  }
  if (typeof description !== "string" || !description.trim()) {
    return { error: "Description is required" };
  }
  if (!STORY_PRIORITIES.includes(priority)) {
    return { error: "Priority must be High, Medium, or Low" };
  }
  if (requireStatus && !STORY_STATUSES.includes(status)) {
    return { error: "Status must be To Do, In Progress, or Done" };
  }
 
  return {
    values: {
      title: title.trim(),
      description: description.trim(),
      priority: priority,
      ...(requireStatus ? { status: status } : {})
    }
  };
}
//check for assigned user 
// return the error code or the user id
async function validateAssignee(rawAssignedId, projectId) {
  if (rawAssignedId === null || rawAssignedId === undefined) {
    return { assignedUserId: null };
  }
 
  const assignedUserId = toObjectId(rawAssignedId);
  if (!assignedUserId) {
    return { error: "Assigned user identifier is invalid", code: 400 };
  }
 
  const user = await users.findOne({ _id: assignedUserId });
  if (!user) {
    return { error: "Assigned user does not exist", code: 404 };
  }
 
  const membership = await memberships.findOne({ project_id: projectId, user_id: assignedUserId });
  if (!membership) {
    return { error: "Assigned user is not a member of this project", code: 400 };
  }
 
  return { assignedUserId: assignedUserId };
}
app.get("/", (req, res) => {
    res.json({
        message: "Server is running"
    });
});

//signup
app.post("/signup", async (req, res) => {
 
    //catch for database errors 
  try {
    const { f_name, l_name, username, password } = req.body;

    //ensures required values are provided
    if (!username || !password) {
      return res.status(400).json({ message: "Required information is missing" });
    }

    //checks if the provided username is available
    const existingUser = await users.findOne({ username: username });
    if (existingUser) {
      return res.status(409).json({ message: "Username already exists" });
    }

    //user creation
    await users.insertOne({ 
      f_name: f_name,
      l_name: l_name,
      username: username, 
      password: password 
    });

    //sucessful account creation
    res.status(201).json({ message: "User created successfully" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "server error" });
  }
});

//login
app.post("/login", async (req, res) => {
  try {
    //user and pass
    const { username, password } = req.body;

    //check for required info 
    if (!username || !password) {
      return res.status(400).json({ message: "Required information is missing" });
    }

    //checks if username is available
    const user = await users.findOne({ username: username });

    //checks for valid credentials
    if (!user || user.password !== password) {
      return res.status(401).json({ message: "Invalid login credentials" });
    }
    res.status(200).json({ message: "Login successful" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

//get users
app.get("/users", async (req, res) => {
  try {
    const allUsers = await users
      .find({}, { projection: { password: 0 } })
      .toArray();

    res.status(200).json(allUsers);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

//create project
app.post("/projects", async (req, res) => {
  try {
    const { name, description, status, project_lead_id } = req.body;

    //ensures required values are provided
    if (!name || !name.trim() || !description || !description.trim() || !status || !project_lead_id) {
      return res.status(400).json({ message: "Required information is missing" });
    }

    //status must be one of the allowed options
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ message: "Status must be Planning, Active, or Completed" });
    }

    //project lead must be a valid id that belongs to an existing user
    const leadId = toObjectId(project_lead_id);
    if (!leadId) {
      return res.status(404).json({ message: "Selected project lead does not exist" });
    }

    const lead = await users.findOne({ _id: leadId });
    if (!lead) {
      return res.status(404).json({ message: "Selected project lead does not exist" });
    }

    //name description status and project lead 
    const result = await projects.insertOne({
      name: name.trim(),
      description: description.trim(),
      status: status,
      project_lead_id: leadId
    });

    //LEAD MEMBERSHIP CREATION
    try {
      await memberships.insertOne({
        project_id: result.insertedId,
        user_id: leadId
      });
    } catch (membershipError) {
      //undo the project 
      await projects.deleteOne({ _id: result.insertedId });
      throw membershipError;
    }

    res.status(201).json({ message: "Project created successfully", project_id: result.insertedId });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

//get all projects
app.get("/projects", async (req, res) => {
  try {
    const allProjects = await projects.aggregate([
      {
        //matches user whose id matches the projectleadid
        $lookup: {
          from: "users",
          localField: "project_lead_id",
          foreignField: "_id",
          as: "lead"
        }
      },
      { $unwind: { path: "$lead", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          name: 1,
          description: 1,
          status: 1,
          project_lead_id: 1,
          lead_f_name: "$lead.f_name",
          lead_l_name: "$lead.l_name",
          lead_username: "$lead.username"
        }
      }
    ]).toArray();

    res.status(200).json(allProjects);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

//get members of a project
app.get("/projects/:projectId/members", async (req, res) => {
  try {
  
    const projectId = toObjectId(req.params.projectId);
    if (!projectId) {
      return res.status(404).json({ message: "Project does not exist" });
    }

    const project = await projects.findOne({ _id: projectId });
    if (!project) {
      return res.status(404).json({ message: "Project does not exist" });
    }

    //find this project's memberships and look up each user so we can show names
    const members = await memberships.aggregate([
      { $match: { project_id: projectId } },
      {
        //turn user ids into names
        $lookup: {
          from: "users",
          localField: "user_id",
          foreignField: "_id",
          as: "user"
        }
      },
      { $unwind: "$user" },
      {
        $project: {
          _id: 0,
          membership_id: "$_id",
          user_id: 1,
          f_name: "$user.f_name",
          l_name: "$user.l_name",
          username: "$user.username"
        }
      }
    ]).toArray();

    //mark which member is the project lead
    const result = members.map((member) => ({
      ...member,
      is_lead: member.user_id.equals(project.project_lead_id)
    }));

    res.status(200).json(result);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

//ADDING A MEMBER CREATES A MEMBERSHIP
app.post("/projects/:projectId/members", async (req, res) => {
  try {
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ message: "Required information is missing" });
    }

    //project must exist
    const projectId = toObjectId(req.params.projectId);
    const project = projectId ? await projects.findOne({ _id: projectId }) : null;
    if (!project) {
      return res.status(404).json({ message: "Project does not exist" });
    }

    //user must exist
    const userId = toObjectId(user_id);
    const user = userId ? await users.findOne({ _id: userId }) : null;
    if (!user) {
      return res.status(404).json({ message: "User does not exist" });
    }

    //user cannot be added to the same project twice
    const existingMembership = await memberships.findOne({ project_id: projectId, user_id: userId });
    if (existingMembership) {
      return res.status(409).json({ message: "User is already a member of this project" });
    }

    await memberships.insertOne({
      project_id: projectId,
      user_id: userId
    });

    res.status(201).json({ message: "Member added successfully" });

  } catch (error) {
    //catch for error 11000 dupe error
    if (error.code === 11000) {
      return res.status(409).json({ message: "User is already a member of this project" });
    }
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

//remove a member from the project
app.delete("/projects/:projectId/members/:userId", async (req, res) => {
  try {
    //project must exist
    const projectId = toObjectId(req.params.projectId);
    const project = projectId ? await projects.findOne({ _id: projectId }) : null;
    if (!project) {
      return res.status(404).json({ message: "Project does not exist" });
    }

    //user must exist
    const userId = toObjectId(req.params.userId);
    const user = userId ? await users.findOne({ _id: userId }) : null;
    if (!user) {
      return res.status(404).json({ message: "User does not exist" });
    }

    //the current project lead cannot be removed
    if (project.project_lead_id.equals(userId)) {
      return res.status(400).json({ message: "The project lead cannot be removed from the project" });
    }
  const assignedStory = await stories.findOne({ project_id: projectId, assigned_user_id: userId });
    if (assignedStory) {
      return res.status(409).json({
        message: "This member still has stories assigned in this project. Reassign, unassign, or delete those stories before removing them."
      });
    }
    //remove the membership record that links this user to this project
    const result = await memberships.deleteOne({ project_id: projectId, user_id: userId });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "User is not a member of this project" });
    }

    res.status(200).json({ message: "Member removed successfully" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

//retrieve stories of a project and assigned usernames
app.get("/projects/:projectId/stories", async (req, res) => {
  try {
    const projectId = toObjectId(req.params.projectId);
    if (!projectId) {
      return res.status(400).json({ message: "Invalid project identifier" });
    }
 
    const project = await projects.findOne({ _id: projectId });
    if (!project) {
      return res.status(404).json({ message: "Project does not exist" });
    }
 
    const projectStories = await stories.aggregate([
      { $match: { project_id: projectId } },
      {

  //translate assigned user id into name 
      $lookup: {
          from: "users",
          localField: "assigned_user_id",
          foreignField: "_id",
          as: "assignee"
        }
      },
      { $unwind: { path: "$assignee", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          project_id: 1,
          title: 1,
          description: 1,
          priority: 1,
          status: 1,
          assigned_user_id: 1,
          assigned_f_name: "$assignee.f_name",
          assigned_l_name: "$assignee.l_name",
          assigned_username: "$assignee.username"
        }
      },
      { $sort: { _id: 1 } }
    ]).toArray();
 
    res.status(200).json(projectStories);
 
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

//create a story in a project
app.post("/projects/:projectId/stories", async (req, res) => {
  try {
    const projectId = toObjectId(req.params.projectId);
    if (!projectId) {
      return res.status(400).json({ message: "Invalid project identifier" });
    }
 
    const project = await projects.findOne({ _id: projectId });
    if (!project) {
      return res.status(404).json({ message: "Project does not exist" });
    }
 
    const checked = validateStoryFields(req.body, false);
    if (checked.error) {
      return res.status(400).json({ message: checked.error });
    }
 
    const assignee = await validateAssignee(req.body.assigned_user_id, projectId);
    if (assignee.error) {
      return res.status(assignee.code).json({ message: assignee.error });
    }
 
  //build document so request is not able to set the status id and project id 
 const newStory = {
      project_id: projectId,
      title: checked.values.title,
      description: checked.values.description,
      priority: checked.values.priority,
      status: "To Do",
      assigned_user_id: assignee.assignedUserId
    };
 
    const result = await stories.insertOne(newStory);
 
    res.status(201).json({ message: "Story created successfully", story_id: result.insertedId });
 
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});
 

//edit stories
app.put("/projects/:projectId/stories/:storyId", async (req, res) => {
  try {
    const projectId = toObjectId(req.params.projectId);
    if (!projectId) {
      return res.status(400).json({ message: "Invalid project identifier" });
    }
    const storyId = toObjectId(req.params.storyId);
    if (!storyId) {
      return res.status(400).json({ message: "Invalid story identifier" });
    }
 
    const project = await projects.findOne({ _id: projectId });
    if (!project) {
      return res.status(404).json({ message: "Project does not exist" });
    }
    const storyQuery = { _id: storyId, project_id: projectId };
    const existingStory = await stories.findOne(storyQuery);
    if (!existingStory) {
      return res.status(404).json({ message: "Story does not exist in this project" });
    }
 
    const checked = validateStoryFields(req.body, true);
    if (checked.error) {
      return res.status(400).json({ message: checked.error });
    }
 
    const assignee = await validateAssignee(req.body.assigned_user_id, projectId);
    if (assignee.error) {
      return res.status(assignee.code).json({ message: assignee.error });
    }
     const updates = {
      title: checked.values.title,
      description: checked.values.description,
      priority: checked.values.priority,
      status: checked.values.status,
      assigned_user_id: assignee.assignedUserId
    };

 //verify story was found 
  const result = await stories.updateOne(storyQuery, { $set: updates });
    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Story does not exist in this project" });
    }
 
    res.status(200).json({ message: "Story updated successfully" });
 
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

 //deleting a story
 app.delete("/projects/:projectId/stories/:storyId", async (req, res) => {
  try {
    const projectId = toObjectId(req.params.projectId);
    if (!projectId) {
      return res.status(400).json({ message: "Invalid project identifier" });
    }
    const storyId = toObjectId(req.params.storyId);
    if (!storyId) {
      return res.status(400).json({ message: "Invalid story identifier" });
    }
 
    const project = await projects.findOne({ _id: projectId });
    if (!project) {
      return res.status(404).json({ message: "Project does not exist" });
    }
 
    const result = await stories.deleteOne({ _id: storyId, project_id: projectId });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Story does not exist in this project" });
    }
 
    res.status(200).json({ message: "Story deleted successfully" });
 
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});
app.listen(9000, () => {
    console.log("Server running on port 9000");
}); 
