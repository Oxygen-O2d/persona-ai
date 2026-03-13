import ollama
from app.core.web_search import get_web_context

class PersonaEngine:
    # Notice we changed the default model to llama3.1
    def __init__(self, model_name="llama3.1"):
        self.model_name = model_name

    async def chat(self, user_query: str, system_prompt: str):
        
        # 1. We define the Python function we want the AI to have access to
        def search_web(query: str) -> str:
            """Searches the internet for real-time news, facts, and current events."""
            return get_web_context(query)

        messages = [
            {'role': 'system', 'content': system_prompt},
            {'role': 'user', 'content': user_query},
        ]

        try:
            # 2. We pass the user's message AND our tool to Llama 3.1
            response = ollama.chat(
                model=self.model_name,
                messages=messages,
                tools=[search_web] # Giving the AI its toolbelt
            )

            # 3. Check if Llama 3.1 decided it needs to use the tool
            if response['message'].get('tool_calls'):
                
                # Append the AI's tool request to the conversation history
                messages.append(response['message'])
                
                for tool in response['message']['tool_calls']:
                    if tool['function']['name'] == 'search_web':
                        # Extract the search query the AI generated
                        search_query = tool['function']['arguments']['query']
                        print(f"🤖 AI is searching the web for: {search_query}")
                        
                        # Execute our actual Python DuckDuckGo script
                        tool_result = search_web(search_query)
                        
                        # Feed the search results back to the AI
                        messages.append({
                            'role': 'tool',
                            'content': tool_result,
                            'name': 'search_web'
                        })
                        
                # 4. Have the AI generate the final answer reading the new web data
                final_response = ollama.chat(
                    model=self.model_name,
                    messages=messages
                )
                return final_response['message']['content']
            
            # If the AI didn't need the tool (e.g., standard study question), just return the normal response
            return response['message']['content']
            
        except Exception as e:
            return f"Error connecting to Ollama: {str(e)}"

persona_engine = PersonaEngine()