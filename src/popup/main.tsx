import ReactDOM from "react-dom/client";
import Popup from "../components/Popup";
import "./popup.css"; // dark theme styling

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Popup root element was not found.");
}

ReactDOM.createRoot(rootElement).render(<Popup />);
