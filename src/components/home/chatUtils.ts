// src/components/home/chatUtils.ts
import { ConversationEntry } from "./MessageBubble";

export const performSmartCopy = (index: number, setToastMessage: (msg: string) => void) => {
  const contentId = `msg-content-${index}`;
  const element = document.getElementById(contentId);
  
  if (!element) {
    setToastMessage("❌ Failed to find content to copy.");
    return;
  }

  try {
    const htmlContent = element.innerHTML;
    const plainTextContent = element.innerText; 

    const blobHtml = new Blob([htmlContent], { type: "text/html" });
    const blobText = new Blob([plainTextContent], { type: "text/plain" });
    
    const data = [new ClipboardItem({
        "text/html": blobHtml,
        "text/plain": blobText,
    })];
    
    navigator.clipboard.write(data).then(() => {
      setToastMessage("✨ Copied to clipboard!");
    });
  } catch (err) {
    console.error("Smart copy failed, falling back:", err);
    navigator.clipboard.writeText(element.innerText).then(() => {
        setToastMessage("Copied text!");
    });
  }
};

export const performShare = async (convoToShow: ConversationEntry[], setToastMessage: (msg: string) => void) => {
  const textContent = convoToShow.map((entry) => { 
    const prefix = entry.type === "user" ? "You" : "Umbil"; 
    return `${prefix}:\n${entry.content}\n\n--------------------\n`; 
  }).join("\n");

  if (navigator.share) { 
    try { 
      await navigator.share({ title: "Umbil Conversation", text: textContent }); 
    } catch (err) { 
      console.log(err); 
    } 
  } else { 
    const blob = new Blob([textContent], { type: "text/plain;charset=utf-8" }); 
    const url = URL.createObjectURL(blob); 
    const a = document.createElement("a"); 
    a.href = url; 
    a.download = "umbil_conversation.txt"; 
    document.body.appendChild(a); 
    a.click(); 
    document.body.removeChild(a); 
    setToastMessage("Conversation downloading..."); 
  }
};