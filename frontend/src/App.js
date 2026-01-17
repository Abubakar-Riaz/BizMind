import React,{useState,useEffect} from "react";
import axios from 'axios';

function App(){
  const [products,setProduct]=useState([]);
  const [query,setQuery]=useState("");
  const [response,setResponse]=useState(null);
  const [loading,setLoading]=useState(false);

  useEffect(()=>{
    fetchProducts();
  },[]);

  const fetchProducts=()=>{
    axios.get('http://127.0.0.1:5000/products')
    .then(response=>{
        setProduct(response.data.products);
    }).catch(error=>console.error("Error fetching data:",error));
  }
  
  const handleAskAI=async ()=>{
    if(!query)
      return;
    setLoading(true);
    setResponse(null);

    try{
      const res=await axios.post('http://127.0.0.1:5000/ask',{question:query})
      setResponse(res.data)
    }
    catch(error){
      console.error("AI Error",error);
      setResponse({error:"Failed to get an answer"});
    }
    setLoading(false);
  };

return (
<div style={{padding:'20px',fontFamily:'Arial'}}>
  <h1>BizMind Inventory</h1>
  
  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'40px'}}>
      <div>
        <h2>Live Inventory</h2>
        {products.length===0?(
            <p>No products found</p>
        ):(
			<ul style={{listStyle:'none', padding:0}}>
				{products.map(p=>(
					<li key={p.id} style={{borderBottom:'1px solid #ddd', padding:'10px 0'}}>
						<strong>{p.name}</strong>
						<br />
						<span style={{color:'#555'}}>${p.price}-Stock:{p.stock}</span>
					</li>
				))}
			</ul>
        )}
      </div>

	  <div>
		<h2>Ask Data Analyst</h2>
		<p>
			Try asking:"What is the most expensice item" or "How many items do we have"
		</p>

		<div>
			<input
			type="text"
			placeholder="Ask a question..."
			value={query}
			onChange={(e)=>setQuery(e.target.value)}
			style={{flex:1,padding:'10px',borderRadius:'5px',border:'1px solid #ccc'}}
			/>
			<button
				onClick={handleAskAI}
				style={{padding: '10px 20px', background: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer'}}
			>{loading? "Thinking":"Ask"}
			</button>
		</div>

		{response && (
            <div style={{ background: 'white', padding: '15px', borderRadius: '5px', border: '1px solid #eee' }}>
              
              {/* If there is an error */}
              {response.error && <p style={{ color: 'red' }}>{response.error}</p>}

              {/* If we have data */}
              {response.answer && (
                <div>
                  <strong>Answer:</strong>
                  <pre style={{ background: '#f4f4f4', padding: '10px', marginTop: '5px' }}>
                    {JSON.stringify(response.answer, null, 2)}
                  </pre>
                  
                  {/* Show the SQL (Good for debugging/Showing off) */}
                  <div style={{ marginTop: '10px', fontSize: '0.8em', color: '#888' }}>
                    <strong>Generated SQL:</strong>
                    <code> {response.generated_sql}</code>
                  </div>
                </div>
              )}
            </div>
          )}
	  </div>
  </div>
</div>
)
}

export default App;
