'use strict';
const mysql=require('mysql2/promise');const crypto=require('crypto');const config=require('./config');let pool;const uuid=()=>crypto.randomUUID();

const DEMO_PHOTOS={
  mountain:'https://commons.wikimedia.org/wiki/Special:Redirect/file/Montanhas_da_Serra_da_mantiqueira.jpg?width=1600',
  burger:'https://images.unsplash.com/photo-1713330801172-03f8d1c0dde7?auto=format&fit=crop&w=1000&q=82',
  chicken:'https://images.unsplash.com/photo-1703219342329-fce8488cf443?auto=format&fit=crop&w=1000&q=82',
  fries:'https://images.unsplash.com/photo-1716973208261-46f8ee456c43?auto=format&fit=crop&w=1000&q=82',
  cheeseBread:'https://commons.wikimedia.org/wiki/Special:Redirect/file/P%C3%A3o_de_queijo.jpg?width=1000',
  cake:'https://commons.wikimedia.org/wiki/Special:Redirect/file/ChocolateCake.jpg?width=1000',
  juice:'https://commons.wikimedia.org/wiki/Special:Redirect/file/OrangeJuice.jpg?width=900'
};

async function initDb(){pool=mysql.createPool({...config.db,waitForConnections:true,connectionLimit:10,decimalNumbers:true,charset:'utf8mb4'});const c=await pool.getConnection();try{
await c.query(`CREATE TABLE IF NOT EXISTS categories (id CHAR(36) PRIMARY KEY,name VARCHAR(100) NOT NULL,slug VARCHAR(120) NOT NULL UNIQUE,sort_order INT NOT NULL DEFAULT 0,active TINYINT(1) NOT NULL DEFAULT 1,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
await c.query(`CREATE TABLE IF NOT EXISTS products (id CHAR(36) PRIMARY KEY,category_id CHAR(36) NOT NULL,sku VARCHAR(60) NULL UNIQUE,name VARCHAR(160) NOT NULL,description TEXT NULL,allergens TEXT NULL,ncm VARCHAR(12) NULL,cest VARCHAR(12) NULL,price_cents INT NOT NULL,image_url VARCHAR(500) NULL,station ENUM('KITCHEN','BAR','BOTH','NONE') NOT NULL DEFAULT 'KITCHEN',active TINYINT(1) NOT NULL DEFAULT 1,available TINYINT(1) NOT NULL DEFAULT 1,stock_qty INT NULL,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,CONSTRAINT fk_product_category FOREIGN KEY (category_id) REFERENCES categories(id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
await c.query(`CREATE TABLE IF NOT EXISTS combos (id CHAR(36) PRIMARY KEY,name VARCHAR(160) NOT NULL,description TEXT NULL,image_url VARCHAR(500) NULL,price_cents INT NOT NULL,active TINYINT(1) NOT NULL DEFAULT 1,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
await c.query(`CREATE TABLE IF NOT EXISTS combo_items (id CHAR(36) PRIMARY KEY,combo_id CHAR(36) NOT NULL,product_id CHAR(36) NOT NULL,quantity INT NOT NULL DEFAULT 1,combo_unit_price_cents INT NOT NULL,CONSTRAINT fk_combo_item_combo FOREIGN KEY (combo_id) REFERENCES combos(id) ON DELETE CASCADE,CONSTRAINT fk_combo_item_product FOREIGN KEY (product_id) REFERENCES products(id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
await c.query(`CREATE TABLE IF NOT EXISTS orders (id CHAR(36) PRIMARY KEY,order_number VARCHAR(20) NOT NULL UNIQUE,customer_name VARCHAR(120) NULL,service_mode ENUM('DINE_IN','TAKEAWAY') NOT NULL DEFAULT 'DINE_IN',status ENUM('CREATED','PAYMENT_PENDING','PAID','QUEUED','PREPARING','READY','DELIVERED','CANCELLED','PAYMENT_FAILED') NOT NULL DEFAULT 'CREATED',payment_method ENUM('PIX','DEBIT','CREDIT') NULL,payment_status VARCHAR(30) NOT NULL DEFAULT 'NOT_STARTED',fiscal_status VARCHAR(30) NOT NULL DEFAULT 'NOT_STARTED',total_cents INT NOT NULL,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,paid_at TIMESTAMP NULL,updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
await c.query(`CREATE TABLE IF NOT EXISTS order_items (id CHAR(36) PRIMARY KEY,order_id CHAR(36) NOT NULL,product_id CHAR(36) NULL,parent_combo_id CHAR(36) NULL,item_type ENUM('PRODUCT','COMBO_COMPONENT') NOT NULL,name VARCHAR(160) NOT NULL,quantity INT NOT NULL,unit_price_cents INT NOT NULL,total_cents INT NOT NULL,station ENUM('KITCHEN','BAR','BOTH','NONE') NOT NULL,ncm VARCHAR(12) NULL,cest VARCHAR(12) NULL,allergens TEXT NULL,notes VARCHAR(500) NULL,CONSTRAINT fk_order_item_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
await c.query(`CREATE TABLE IF NOT EXISTS payments (id CHAR(36) PRIMARY KEY,order_id CHAR(36) NOT NULL,method VARCHAR(20) NOT NULL,provider VARCHAR(40) NOT NULL,status VARCHAR(30) NOT NULL,amount_cents INT NOT NULL,external_id VARCHAR(160) NULL,payload_json JSON NULL,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,CONSTRAINT fk_payment_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
await c.query(`CREATE TABLE IF NOT EXISTS fiscal_documents (id CHAR(36) PRIMARY KEY,order_id CHAR(36) NOT NULL,provider VARCHAR(40) NOT NULL,status VARCHAR(30) NOT NULL,access_key VARCHAR(80) NULL,document_number VARCHAR(40) NULL,xml_url VARCHAR(500) NULL,danfe_url VARCHAR(500) NULL,payload_json JSON NULL,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,CONSTRAINT fk_fiscal_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
await c.query(`CREATE TABLE IF NOT EXISTS print_jobs (id CHAR(36) PRIMARY KEY,order_id CHAR(36) NOT NULL,destination ENUM('KITCHEN','BAR','CUSTOMER','FISCAL') NOT NULL,status ENUM('PENDING','CLAIMED','PRINTED','FAILED','CANCELLED') NOT NULL DEFAULT 'PENDING',payload_json JSON NOT NULL,claimed_by VARCHAR(120) NULL,error_text TEXT NULL,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,CONSTRAINT fk_print_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
await c.query(`CREATE TABLE IF NOT EXISTS ad_campaigns (id CHAR(36) PRIMARY KEY,title VARCHAR(160) NOT NULL,media_type ENUM('IMAGE','VIDEO','COLOR') NOT NULL DEFAULT 'COLOR',media_url VARCHAR(500) NULL,background VARCHAR(30) NULL,message VARCHAR(300) NULL,duration_seconds INT NOT NULL DEFAULT 10,active TINYINT(1) NOT NULL DEFAULT 1,starts_at DATETIME NULL,ends_at DATETIME NULL,sort_order INT NOT NULL DEFAULT 0,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
await c.query(`CREATE TABLE IF NOT EXISTS audit_events (id BIGINT AUTO_INCREMENT PRIMARY KEY,actor VARCHAR(120) NOT NULL,action VARCHAR(120) NOT NULL,entity_type VARCHAR(80) NULL,entity_id VARCHAR(80) NULL,payload_json JSON NULL,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
await c.query(`CREATE TABLE IF NOT EXISTS settings (setting_key VARCHAR(120) PRIMARY KEY,setting_value TEXT NULL,updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
const [[{total}]]=await c.query('SELECT COUNT(*) total FROM categories');if(!total)await seed(c);await applyValeDemoSkin(c);
}finally{c.release()}return pool}

async function seed(c){const cats=[['Lanches','lanches',10],['Bebidas','bebidas',20],['Doces','doces',30],['Acompanhamentos','acompanhamentos',40]].map(([name,slug,sort])=>({id:uuid(),name,slug,sort}));for(const x of cats)await c.execute('INSERT INTO categories(id,name,slug,sort_order) VALUES(?,?,?,?)',[x.id,x.name,x.slug,x.sort]);const by=Object.fromEntries(cats.map(x=>[x.slug,x.id]));const ps=[[by.lanches,'Lanche da Casa','Pao, carne, queijo e molho da casa','Gluten, leite',2490,'KITCHEN','21069090',null],[by.lanches,'Sanduiche de Frango','Frango grelhado, queijo e salada','Gluten, leite',2190,'KITCHEN','21069090',null],[by.bebidas,'Refrigerante 500 ml','Escolha gelada para acompanhar',null,890,'BAR','22021000',null],[by.bebidas,'Agua Mineral','Sem gas, 500 ml',null,590,'BAR','22011000',null],[by.doces,'Sobremesa da Casa','Sobremesa individual','Leite',1290,'KITCHEN','21050090',null],[by.acompanhamentos,'Batata Crocante','Porcao individual',null,1190,'KITCHEN','20041000',null]];const ids=[];for(const p of ps){const id=uuid();ids.push(id);await c.execute('INSERT INTO products(id,category_id,name,description,allergens,price_cents,station,ncm,cest) VALUES(?,?,?,?,?,?,?,?,?)',[id,...p])}const combo=uuid();await c.execute('INSERT INTO combos(id,name,description,price_cents) VALUES(?,?,?,?)',[combo,'Combo Classico','Lanche da Casa + Batata Crocante + Refrigerante 500 ml',3990]);for(const [pid,q,price] of [[ids[0],1,2200],[ids[5],1,1000],[ids[2],1,790]])await c.execute('INSERT INTO combo_items(id,combo_id,product_id,quantity,combo_unit_price_cents) VALUES(?,?,?,?,?)',[uuid(),combo,pid,q,price]);await c.execute('INSERT INTO ad_campaigns(id,title,media_type,background,message,duration_seconds,sort_order) VALUES(?,?,?,?,?,?,?)',[uuid(),'Bem-vindo','COLOR','#ffcf1a','Monte seu pedido na tela. Toque para começar.',10,10]);for(const s of [['idle_ad_seconds','45'],['abandoned_cart_seconds','120'],['allow_dine_in','1'],['allow_takeaway','1']])await c.execute('INSERT INTO settings(setting_key,setting_value) VALUES(?,?)',s)}

async function applyValeDemoSkin(c){
  const [seedRows]=await c.query("SELECT id,name FROM products WHERE name IN ('Lanche da Casa','Sanduiche de Frango','Refrigerante 500 ml','Sobremesa da Casa','Batata Crocante')");
  const names=new Set(seedRows.map(x=>x.name));
  if(!names.has('Lanche da Casa')||!names.has('Sanduiche de Frango')||!names.has('Batata Crocante'))return;

  await c.execute("UPDATE products SET name=?,description=?,price_cents=?,image_url=? WHERE name='Lanche da Casa'",['Hambúrguer Vale da Mantiqueira','Pão brioche, carne, queijo, alface, tomate e molho da casa',2890,DEMO_PHOTOS.burger]);
  await c.execute("UPDATE products SET name=?,description=?,price_cents=?,image_url=? WHERE name='Sanduiche de Frango'",['Sanduíche de Frango com Requeijão','Frango, requeijão cremoso, queijo e salada',2490,DEMO_PHOTOS.chicken]);
  await c.execute("UPDATE products SET name=?,description=?,price_cents=?,image_url=? WHERE name='Refrigerante 500 ml'",['Suco Natural de Laranja','Suco natural gelado, 300 ml',1290,DEMO_PHOTOS.juice]);
  await c.execute("UPDATE products SET name=?,description=?,price_cents=?,image_url=? WHERE name='Sobremesa da Casa'",['Bolo de Chocolate','Fatia generosa de bolo de chocolate',1490,DEMO_PHOTOS.cake]);
  await c.execute("UPDATE products SET name=?,description=?,price_cents=?,image_url=? WHERE name='Batata Crocante'",['Batata Rústica','Batatas douradas com ervas da Mantiqueira',1690,DEMO_PHOTOS.fries]);

  let [[cafe]]=await c.query("SELECT id FROM categories WHERE slug='cafe' LIMIT 1");
  if(!cafe){cafe={id:uuid()};await c.execute('INSERT INTO categories(id,name,slug,sort_order,active) VALUES(?,?,?,?,1)',[cafe.id,'Café','cafe',25]);}
  const [[bread]]=await c.query("SELECT COUNT(*) total FROM products WHERE name='Pão de Queijo Artesanal'");
  if(!bread.total)await c.execute('INSERT INTO products(id,category_id,name,description,allergens,price_cents,image_url,station,active,available) VALUES(?,?,?,?,?,?,?,?,1,1)',[uuid(),cafe.id,'Pão de Queijo Artesanal','Porção com 3 unidades, receita mineira','Leite',1690,DEMO_PHOTOS.cheeseBread,'KITCHEN']);

  await c.execute("UPDATE combos SET name=?,description=?,image_url=? WHERE name='Combo Classico'",['Combo Mantiqueira','Hambúrguer + Batata Rústica + Suco Natural de Laranja',DEMO_PHOTOS.burger]);

  const [[ads]]=await c.query('SELECT COUNT(*) total FROM ad_campaigns');
  if(ads.total<=1){
    await c.query('DELETE FROM ad_campaigns');
    const campaigns=[
      ['Sabores que aproximam',DEMO_PHOTOS.mountain,'Mais que uma refeição: uma experiência na Mantiqueira.',9,10],
      ['Pão de Queijo Artesanal',DEMO_PHOTOS.cheeseBread,'Um clássico mineiro para qualquer hora do dia.',8,20],
      ['Lanches, sabores e boas histórias',DEMO_PHOTOS.burger,'Monte seu pedido do seu jeito.',8,30],
      ['Doces que fazem memórias',DEMO_PHOTOS.cake,'Finalize seu momento com um toque especial.',8,40]
    ];
    for(const [title,url,message,duration,sort] of campaigns)await c.execute('INSERT INTO ad_campaigns(id,title,media_type,media_url,background,message,duration_seconds,active,sort_order) VALUES(?,?,\'IMAGE\',?,NULL,?,?,1,?)',[uuid(),title,url,message,duration,sort]);
  }
}

function getPool(){if(!pool)throw new Error('Database not initialized');return pool}async function audit(actor,action,entityType=null,entityId=null,payload=null){await getPool().execute('INSERT INTO audit_events(actor,action,entity_type,entity_id,payload_json) VALUES(?,?,?,?,?)',[actor,action,entityType,entityId,payload?JSON.stringify(payload):null])}
module.exports={initDb,getPool,uuid,audit};
