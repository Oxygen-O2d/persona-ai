import ollama

def test_persona():
    print("Talking to your Persona AI...")
    response = ollama.chat(model='gemma3:4b', messages=[
        {'role': 'system', 'content': 'You are a helpful study assistant.'},
        {'role': 'user', 'content': 'Hey! Briefly explain what a Neural Network is.'},
    ])
    print("-" * 30)
    print(response['message']['content'])

if __name__ == "__main__":
    test_persona()