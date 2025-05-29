//. db_cloudant.js
var express = require( 'express' ),
    bodyParser = require( 'body-parser' ),
    api = express();

//process.env.PGSSLMODE = 'no-verify';
var PG = require( 'pg' );
PG.defaults.ssl = true;
var database_url = 'DATABASE_URL' in process.env ? process.env.DATABASE_URL : settings.database_url; 
var pg = null;
var pg_params = { idleTimeoutMillis: ( 3 * 86400 * 1000 ) };
if( database_url ){
  console.log( 'database_url = ' + database_url );
  pg_params.connectionString = database_url;
  PG.defaults.ssl = false;

  pg = new PG.Pool( pg_params );
}

api.use( bodyParser.urlencoded( { extended: true } ) );
api.use( bodyParser.json() );
api.use( express.Router() );


//. createTransaction
api.createTransaction = async function( transaction_id, user_id, order_id, amount, currency ){
  return new Promise( async function( resolve, reject ){
    if( pg ){
      conn = await pg.connect();
      if( conn ){
        try{
          var sql = 'insert into transactions( id, user_id, order_id, amount, currency, created ) values ( $1, $2, $3, $4, $5, $6 )';
          var t = ( new Date() ).getTime();
          var query = { text: sql, values: [ transaction_id, user_id, order_id, amount, currency, t ] };
          conn.query( query, function( err, result ){
            if( err ){
              console.log( err );
              resolve( { status: false, error: err } );
            }else{
              resolve( { status: true, result: result } );
            }
          });
        }catch( e ){
          console.log( e );
          resolve( { status: false, error: err } );
        }finally{
          if( conn ){
            conn.release();
          }
        }
      }else{
        resolve( { status: false, error: 'no connection.' } );
      }
    }else{
      resolve( { status: false, error: 'db not ready.' } );
    }
  });
};

//. getTransactions
api.getTransactions = async function( limit, offset ){
  return new Promise( async function( resolve, reject ){
    if( pg ){
      conn = await pg.connect();
      if( conn ){
        try{
          var sql = "select * from transactions order by created desc";
          if( limit ){
            sql += " limit " + limit;
          }
          if( offset ){
            sql += " start " + offset;
          }
          var query = { text: sql, values: [] };
          conn.query( query, function( err, result ){
            if( err ){
              console.log( err );
              resolve( { status: false, error: err } );
            }else{
              resolve( { status: true, result: result.rows } );
            }
          });
        }catch( e ){
          console.log( e );
          resolve( { status: false, error: err } );
        }finally{
          if( conn ){
            conn.release();
          }
        }
      }else{
        resolve( { status: false, error: 'no connection.' } );
      }
    }else{
      resolve( { status: false, error: 'db not ready.' } );
    }
  });
};

//. api をエクスポート
module.exports = api;
