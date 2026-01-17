import React,{useState,useEffect} from "react";
import axios from 'axios';

// const AIResultDisplay=({data})=>{
// 	// if(!data || data.length===0)
// 	// 	return <p>No results found</p>
// 	const firstItem=data[0];
// 	const keys=Object.keys(firstItem);

// 	if(data.length===1 && keys.length===1){
// 		const value=firstItem[keys[0]];
// 		return (
// 			<div style={{textAlign:'center', padding:'20px'}}>
// 				<h3 style={{margin:0,color:'#666',fontSize:'1rem'}}>{keys[0].replace(/_/g,' ')}</h3>
// 				<p style={{fontSize:'3rem',fontWeight:'bold',color:'#007bff',margin:'10px 0'}}>
// 					{value}
// 				</p>
// 			</div>
// 		)
// 	}
// 	return (
//     <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
//       <thead>
//         <tr style={{ background: '#f4f4f4', textAlign: 'left' }}>
//           {keys.map((k) => (
//             <th key={k} style={{ padding: '10px', borderBottom: '2px solid #ddd' }}>
//               {k.toUpperCase()}
//             </th>
//           ))}
//         </tr>
//       </thead>
//       <tbody>
//         {data.map((row, idx) => (
//           <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
//             {keys.map((k) => (
//               <td key={k} style={{ padding: '10px' }}>{row[k]}</td>
//             ))}
//           </tr>
//         ))}
//       </tbody>
//     </table>
//   );
// }

function App(){
	const [products,setProduct]=useState([]);
	const [query,setQuery]=useState("");
	const [response,setResponse]=useState(null);
	const [loading,setLoading]=useState(false);

	const cardStyle = {
  background: 'white',
  padding: '25px',
  borderRadius: '12px',
  boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
};
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
	<div style={{ 
	padding: '40px', 
	fontFamily: '"Segoe UI", Roboto, Helvetica, Arial, sans-serif', 
	background: '#f0f2f5', // Light gray dashboard background
	minHeight: '100vh' 
	}}>
	<h1>BizMind Inventory</h1>
	
	<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'40px'}}>
		<div style={cardStyle}>
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

		<div style={cardStyle}>
			<h2>Ask Data Analyst</h2>
			{/* <p>
				Try asking:"What is the most expensice item" or "How many items do we have"
			</p> */}

			<div>
				<input
				type="text"
				placeholder="Ask a question..."
				value={query}
				onChange={(e)=>setQuery(e.target.value)}
				style={{flex:1,padding:'10px',borderRadius:'5px',border:'1px solid #ccc',width:'70%'}}
				/>
				<button
					onClick={handleAskAI}
					style={{padding: '10px 20px', background: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer'}}
				>{loading? "Thinking":"Ask"}
				</button>
			</div>

			{/* Display the Answer */}
			{response && (
			<div style={{ background: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', marginTop: '20px' }}>
				
				{/* Error Message */}
				{response.error && <p style={{ color: 'red' }}>{response.error}</p>}

				{/* The Smart Display */}
				{response.answer && (
				<div>
					<div style={{ marginBottom: '15px', paddingBottom: '10px', borderBottom: '1px solid #eee' }}>
					<strong>🤖 Analysis Result:</strong>
					</div>
					
					{/* HERE IS THE NEW COMPONENT */}
					{/* <AIResultDisplay data={response.answer} /> */}

					{/* Debug SQL (Optional: make it smaller/collapsible) */}
					<div style={{ marginTop: '20px', fontSize: '0.75em', color: '#999', background: '#f9f9f9', padding: '8px', borderRadius: '4px' }}>
						<p>{response.answer}</p>
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
