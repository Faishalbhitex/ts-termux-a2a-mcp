import axios from "axios";

async function discoveryAgents() {
  try {
    const { data } = await axios.get("http://localhost:8080/agents");
    console.log("Discovered agents:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Error fetching agents:", err.message);
  }
}

discoveryAgents();
