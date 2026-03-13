from duckduckgo_search import DDGS

def get_web_context(query: str, max_results: int = 3) -> str:
    """
    Searches the web and compiles the top results into a readable context string.
    """
    try:
        with DDGS() as ddgs:
            results = list(ddgs.text(query, max_results=max_results))
            
        if not results:
            return "No web results found."
            
        context = "Here is the latest information from the web:\n\n"
        for i, r in enumerate(results):
            context += f"Source {i+1}: {r.get('title')}\n"
            context += f"Snippet: {r.get('body')}\n\n"
            
        return context
    except Exception as e:
        return f"Web search failed: {str(e)}"