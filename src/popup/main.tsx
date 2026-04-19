import { mountPopup } from "../components/Popup";
import "./popup.css"; // dark theme styling

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Popup root element was not found.");
}

mountPopup(rootElement);
