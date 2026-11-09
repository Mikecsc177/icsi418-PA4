import { useState } from "react";

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    
    try{
    const response = await fetch("http://localhost:9000/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        username: username,
        password: password
      })
    });
    const data = await response.json();
    if (response.ok) {
        //successful
      setMessage(data.message || "Login was successful");
    } else {
        //failed
      setMessage(data.message || "Login has failed try again");
    }
    } catch (error) { 
        setMessage("Could not connect to the server");
    }
  }

  return (
    <div>
      <h2>Login</h2>
      
      <form onSubmit={handleSubmit}>
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
        
        <button type="submit">Login</button>
      </form>

     {message && <p>{message}</p>}
    </div>
  );
}

export default Login;