from flask import Flask,jsonify,request
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import text

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

    generated_Sql=mock_ai_sql_generator(query)

    try:
        result=db.session.execute(text(generated_Sql))

        data=[dict(row._mapping) for row in result]

        return jsonify({"answer":data,"generated sql":generated_Sql})
    except Exception as e:
        return jsonify({"error":str(e)})
    
if __name__=='__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True,port=5000)
