import streamlit as st
import requests

st.set_page_config(page_title="Persona AI", page_icon="✨", layout="wide")
st.markdown("<style>.block-container { padding-top: 2rem; padding-bottom: 2rem; }</style>", unsafe_allow_html=True)

st.title("✨ Persona AI")

# --- SIDEBAR: DUAL MODE TOGGLE ---
with st.sidebar:
    st.header("⚙️ Persona Mode")
    
    # The Mode Switcher
    app_mode = st.radio(
        "Select capability:",
        ["🌐 Web Assistant (Live News/Search)", "📚 Study Scanner (PDF/PPT)"]
    )
    
    st.divider()
    
    uploaded_file = None
    # Only show the file uploader if Study Scanner is selected
    if app_mode == "📚 Study Scanner (PDF/PPT)":
        st.header("Study Materials")
        uploaded_file = st.file_uploader("Upload PDF/PPT", type=["pdf", "pptx"])
        
    st.divider()
    if st.button("Clear Chat History", use_container_width=True):
        st.session_state.messages = []
        st.rerun()

# Initialize Chat
if "messages" not in st.session_state:
    st.session_state.messages = [{"role": "assistant", "content": "Hello! How can I help you today?"}]

# Render History
for message in st.session_state.messages:
    with st.chat_message(message["role"]):
        st.markdown(message["content"])

# Chat Input
if prompt := st.chat_input("Ask me anything..."):
    with st.chat_message("user"):
        st.markdown(prompt)
    st.session_state.messages.append({"role": "user", "content": prompt})

    with st.chat_message("assistant"):
        with st.spinner("Processing..."):
            try:
                # ROUTING LOGIC BASED ON SELECTED MODE
                if app_mode == "🌐 Web Assistant (Live News/Search)":
                    API_URL = "http://127.0.0.1:8000/web-ask"
                    response = requests.post(API_URL, params={"query": prompt})
                    answer = response.json().get("response", "No answer found.") if response.status_code == 200 else f"Error: {response.text}"
                
                elif app_mode == "📚 Study Scanner (PDF/PPT)":
                    if uploaded_file:
                        API_URL = "http://127.0.0.1:8000/upload-and-study"
                        files = {"file": (uploaded_file.name, uploaded_file.getvalue(), "application/pdf")}
                        data = {"question": prompt}
                        response = requests.post(API_URL, files=files, data=data)
                        answer = response.json().get("answer", "No answer found.") if response.status_code == 200 else f"Error: {response.text}"
                    else:
                        # Fallback if they forgot to upload a document
                        answer = "Please upload a document in the sidebar first, or switch to Web Assistant mode."
                
                st.markdown(answer)
                st.session_state.messages.append({"role": "assistant", "content": answer})

            except Exception as e:
                st.error(f"Failed to connect to backend: {e}")