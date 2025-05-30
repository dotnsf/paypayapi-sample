//. app.js
var express = require( 'express' ),
    bodyParser = require( 'body-parser' ),
    ejs = require( 'ejs' ),
    fs = require( 'fs' ),
    session = require( 'express-session' ),
    { v4: uuidv4 } = require( 'uuid' ),
    app = express();

require( 'dotenv' ).config();
  
app.use( bodyParser.urlencoded( { extended: true } ) );
app.use( bodyParser.json() );
app.use( express.Router() );
app.use( express.static( __dirname + '/public' ) );

app.set( 'views', __dirname + '/views' );
app.set( 'view engine', 'ejs' );

//. setup session
var session_params = { 
  secret: 'paypayapi-sample',
  resave: false,
  cookie: {
    httpOnly: true,
    path: '/',
    maxAge: ( 7 * 24 * 60 * 60 * 1000 )  //. １週間保持
  },
  saveUninitialized: false
};
app.use( session( session_params ) );

var dbapi = require( './api/db_postgresql' );
app.use( '/db', dbapi );


//. 購入画面
app.get( '/', async function( req, res ){
  //. 対象商品
  var items = JSON.parse( fs.readFileSync( './items.json' ) );

  res.render( 'index', { items: items } );
});

//. 管理画面
app.get( '/admin', async function( req, res ){
  var transactions = [];
  var limit = 0;
  var offset = 0;

  var r = await dbapi.getTransactions( limit, offset );
  if( r && r.status ){
    transactions = r.result;
  }

  res.render( 'admin', { transactions: transactions } );
});

//. PayPay
var PAYPAY = require( "@paypayopa/paypayopa-sdk-node" );
var PAYPAY_API_KEY = ( 'PAYPAY_API_KEY' in process.env && process.env.PAYPAY_API_KEY ? process.env.PAYPAY_API_KEY : '' );
var PAYPAY_API_SECRET = ( 'PAYPAY_API_SECRET' in process.env && process.env.PAYPAY_API_SECRET ? process.env.PAYPAY_API_SECRET : '' );
var PAYPAY_MERCHANT_ID = ( 'PAYPAY_MERCHANT_ID' in process.env && process.env.PAYPAY_MERCHANT_ID ? process.env.PAYPAY_MERCHANT_ID : '' );
var PAYPAY_REDIRECT_URL = ( 'PAYPAY_REDIRECT_URL' in process.env && process.env.PAYPAY_REDIRECT_URL ? process.env.PAYPAY_REDIRECT_URL : '' );

PAYPAY.Configure({
  clientId: PAYPAY_API_KEY,
  clientSecret: PAYPAY_API_SECRET,
  merchantId: PAYPAY_MERCHANT_ID,
  productionMode: false
});

app.get( '/paypay/uaid', async function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );

  var payload ={
    scopes: [ "direct_debit" ],
    nonce: "abc",
    redirectType: "WEB_LINK",
    redirectUrl: PAYPAY_REDIRECT_URL,
    referenceId: "reference_id"
  };
  var response = await PAYPAY.AccountLinkQRCodeCreate( payload );
  var body = response.BODY;
  console.log( {body} );

  res.write( JSON.stringify( { status: true } ) );
  res.end();
});

app.post( '/paypay/qrcode', function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );

  //. 購入内容
  var options = req.body; //. { productName: "xx", amount: 100, currency: "JPY" }

  if( options.amount && typeof options.amount == 'string' ){
    options.amount = parseInt( options.amount );
  }

  if( options.amount ){
    var payload = {
      merchantPaymentId: 'paypayapi-sample' + uuidv4(),
      amount: { amount: options.amount, currency: options.currency },
      codeType: "ORDER_QR",
      orderDescription: options.productName,
      isAuthorization: false,
      redirectUrl: PAYPAY_REDIRECT_URL,
      redirectType: "WEB_LINK",
      userAgent: 'PayPayAPI Sample App/0.0.1'
    };
    PAYPAY.QRCodeCreate( payload, function( response ){
      //console.log( response );
      if( response.STATUS && response.STATUS >= 200 && response.STATUS < 300 ){   //. 実際は 201
        var qr_data = response.BODY.data;

        req.session.qr_data = qr_data;
        res.write( JSON.stringify( { status: response.STATUS, body: JSON.parse( response.BODY ) } ) );
        res.end();
      }else{
        res.status( response.STATUS );
        res.write( JSON.stringify( { status: response.STATUS, body: JSON.parse( response.BODY ) } ) );
        res.end();
      }
    });
  }else{
    res.status( 400 );
    res.write( JSON.stringify( { status: 400, error: 'no amount info found.' } ) );
    res.end();
  }
});

app.get( '/paypay/payment/confirm/:merchantPaymentId', function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );

  if( req.params.merchantPaymentId ){
    PAYPAY.GetCodePaymentDetails( Array( req.params.merchantPaymentId ), function( response ){
      //console.log( response );
      if( response.STATUS && response.STATUS >= 200 && response.STATUS < 300 ){   //. 実際は 201
        res.write( JSON.stringify( { status: response.STATUS, body: JSON.parse( response.BODY ) } ) );
        res.end();
      }else{
        res.status( response.STATUS );
        res.write( JSON.stringify( { status: response.STATUS, body: JSON.parse( response.BODY ) } ) );
        res.end();
      }
    });
  }else{
    res.status( 400 );
    res.write( JSON.stringify( { status: 400, error: 'no merchantPaymentId info found.' } ) );
    res.end();
  }
});

app.post( '/paypay/payment/cancel/:merchantPaymentId', function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );

  if( req.params.merchantPaymentId ){
    PAYPAY.PaymentCancel( Array( req.params.merchantPaymentId ), function( response ){
      if( response.STATUS && response.STATUS >= 200 && response.STATUS < 300 ){   //. 実際は 201
        res.write( JSON.stringify( { status: response.STATUS, body: JSON.parse( response.BODY ) } ) );
        res.end();
      }else{
        res.status( response.STATUS );
        res.write( JSON.stringify( { status: response.STATUS, body: JSON.parse( response.BODY ) } ) );
        res.end();
      }
    });
  }else{
    res.status( 400 );
    res.write( JSON.stringify( { status: 400, error: 'no merchantPaymentId info found.' } ) );
    res.end();
  }
});

app.post( '/paypay/payment/refund/:merchantPaymentId', function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );

  if( req.params.merchantPaymentId && req.body && req.body.reason ){
    PAYPAY.GetCodePaymentDetails( Array( req.params.merchantPaymentId ), function( response0 ){
      if( response0.STATUS && response0.STATUS >= 200 && response0.STATUS < 300 ){   //. 実際は 201
        var payment_id = response0.BODY.data.paymentId;
        var amount = {
          amount: response0.BODY.data.amount.amount,
          currency: response0.BODY.data.amount.currency
        };
        var payload = {
          merchantRefundId: req.params.merchantPaymentId + '-refund',
          paymentId: payment_id,
          amount: amount,
          reason: req.body.reason
        };
        PAYPAY.PaymentRefund( payload, function( response ){
          if( response.STATUS && response.STATUS >= 200 && response.STATUS < 300 ){   //. 実際は 201
            res.write( JSON.stringify( { status: response.STATUS, body: JSON.parse( response.BODY ) } ) );
            res.end();
          }else{
            res.status( response.STATUS );
            res.write( JSON.stringify( { status: response.STATUS, body: JSON.parse( response.BODY ) } ) );
            res.end();
          }
        });
      }else{
        res.status( response0.STATUS );
        res.write( JSON.stringify( { status: response0.STATUS, body: JSON.parse( response0.BODY ) } ) );
        res.end();
      }
    });
  }else{
    res.status( 400 );
    res.write( JSON.stringify( { status: 400, error: 'no merchantPaymentId and/or reason found.' } ) );
    res.end();
  }
});

app.get( '/paypay/redirect', async function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );

  var qr_data = req.session.qr_data;
  //. console.log( {qr_data} );
  if( qr_data.merchantPaymentId ){
    var order_id = '';
    var response = await PAYPAY.GetCodePaymentDetails( Array( qr_data.merchantPaymentId ) );
    console.log( {response} );
    if( response.STATUS && response.STATUS >= 200 && response.STATUS < 300 ){   //. 実際は 201
      var body = JSON.parse( response.BODY );
      if( body && body.data && body.data.paymentId ){
        order_id = body.data.paymentId;
      }
    }

    await dbapi.createTransaction( qr_data.merchantPaymentId, order_id, qr_data.amount.amount, qr_data.amount.currency );
      /*
      response.BODY = {
        resultInfo: {
          code: 'SUCCESS',
          message: 'Success',
          codeId: 'nnnnnnnn'
        },
        data: {
          codeId: 'xxxx',
          url: 'https://qr-stg.sandbox.paypay.ne.jp/xxxxxxxxx',
          expireDate: nnnnnnn,
          merchantPaymentId: 'paypayapi-sample-xxxxxxxxxxxxxxxxxxx',,
          amount: {
            amount: 100,
            currency: 'JPY'
          },
          orderDescription: 'ｘｘｘ利用料',
          codeType: 'ORDER_QR',
          requestedAt: nnnnnnn,
          redirectUrl: 'http://localhost:8080/paypay/redirect',
          redirectType: 'WEB_LINK',
          isAuthorization: false,
          deeplink: 'paypay://payment?link_key=（data.url をエンコードした文字列）'
        }
      };
      response.BODY.data を記憶させて、リダイレクト後に処理するべき？
      */
  }else{
  }

  delete req.session.qr_data;

  res.redirect( '/' );
});

const port = process.env.PORT || 8080;
app.listen( port, function (){
  console.log( 'Server start on port ' + port + ' ...' );
});
