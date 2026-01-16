from flask import Flask
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy

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

if __name__=='__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True,port=5000)
