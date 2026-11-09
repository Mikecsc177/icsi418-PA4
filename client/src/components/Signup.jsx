import { useState } from "react";

function Signup() {
  const [f_name, setF_name] = useState("");
  const [l_name, setL_name] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    
    try{
    const response = await fetch("http://localhost:9000/signup", {
      method: "POST",
      headers: {
      //json string that sends users data
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        f_name: f_name,
        l_name: l_name,
        username: username,
        password: password
      })
    });
    const data = await response.json();
    if (response.ok) {
        //successful
      setMessage(data.message || "signup was successful");
    } else {
        //failed
      setMessage(data.message || "signup has failed try again");
    }
    } catch (error) { 
        setMessage("Could not connect to the server");
    }
  }

  return (
    <div>
      <h2>Sign Up</h2>
      
      <form onSubmit={handleSubmit}>
      <input
          type="text"
          placeholder="First Name"
          value={f_name}
          onChange={(event) => setF_name(event.target.value)}
        />
        
        <br /><br />

        <input
          type="text"
          placeholder="Last Name"
          value={l_name}
          onChange={(event) => setL_name(event.target.value)}
        />
        
        <br /><br />
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
        />
        
        <br /><br />
        
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        
        <br /><br />
        
        <button type="submit">Sign Up</button>
      </form>

     {message && <p>{message}</p>}
    </div>
  );
}

export default Signup;