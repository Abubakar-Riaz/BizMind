import os
from flask import Flask,jsonify,request
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import text
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()
API_KEY=os.getenv('GOOGLE_API_KEY')

genai.configure(api_key=API_KEY)

app=Flask(__name__)
CORS(app)

app.config['SQLALCHEMY_DATABASE_URI']='sqlite:///bizmind.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS']=False

db=SQLAlchemy(app)

class Product(db.Model):
    id=db.Column(db.Integer,primary_key=True)
    name=db.Column(db.String(100),nullable=False)
    price=db.Column(db.Float,nullable=False)
    stock=db.Column(db.Integer,default=0)

def mock_ai_sql_generator(query):
    query=query.lower()

    if "how many" in query or "count" in query:
        return "SELECT sum(stock) as total_stock FROM product"
    elif "expensive" in query or "highest price" in query:
        return "SELECT name,price FROM product ORDER BY price DESC LIMIT 1"
    
    return "SELECT * FROM product"

def get_sql_from_gemini(query):
    prompt=f"""
            You are an expert SQL Data Analyst.
        I have a SQLite table named 'product'.
        Columns:
        - id (integer)
        - name (text)
        - price (float)
        - stock (integer)

        Task: Convert this English question into a SQL query.
        Question: "{query}"
        
        Rules:
        1. Return ONLY the raw SQL query. Do not use Markdown (no ```sql).
        2. Do not explain your answer.
        3. If the user asks for total value, use SUM(price * stock).
    """

    model=genai.GenerativeModel('gemini-3-flash-preview')
    response=model.generate_content(prompt)

    return response.text.replace('```sql', '').replace('```', '').strip()

def get_summary_from_gemini(query,generated_sql,result):
    
    if len(result)>0:
        summary_prompt = f"""
        User Question: "{query}"
        SQL Query Run: "{generated_sql}"
        Database Result: {result}

        Task: Answer the user's question naturally based on this data. 
        If it's a list, just say "Here is the list:" and summarize briefly.
        Keep it short and professional.
    """
        
        summary_model = genai.GenerativeModel('gemini-3-flash-preview')
        summary_response = summary_model.generate_content(summary_prompt)
        human_answer = str(summary_response.text)
    else:
        human_answer = "I found no data matching that request."

        # Step 5: Return BOTH the data (for tables) and the text (for chat)
    return human_answer

@app.route('/products',methods=['GET'])
def get_products():
    products=Product.query.all()

    output=[]
    for product in products:
        product_data={'id':product.id, 'name':product.name, 'price':product.price, 'stock':product.stock}
        output.append(product_data)
    return jsonify({"products":output})

@app.route('/products',methods=['POST'])
def add_product():
    data=request.get_json()

    new_product=Product(name=data['name'],price=data['price'],stock=data.get('stock',0))
    db.session.add(new_product)
    db.session.commit()
    return jsonify({'message':'Product Created Successfully'})

@app.route('/ask',methods=['POST'])
def ask_database():
    query=request.json.get('question')
    generated_Sql=get_sql_from_gemini(query)

    try:
        result=db.session.execute(text(generated_Sql))

        data=[dict(row._mapping) for row in result]

        finalResponse=get_summary_from_gemini(query,generated_Sql,data)
        return jsonify({"answer":finalResponse,"generated sql":generated_Sql})
    except Exception as e:
        return jsonify({"error":str(e)})
    
if __name__=='__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True,port=5000)
