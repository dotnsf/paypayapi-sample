# PayPay API sample

## Overview

Sample applicatoin with Node.js for PayPay API


## Configuration

- testuserids.json
  - テストユーザー ID の配列
  - 「どのユーザーが取引したか」を識別するための ID
    - 記録するトランザクションにユーザーに関する情報がないと問い合わせ対応や返金対応ができなくなる
  - PayPay Developer の SandBox 環境で使う場合は、アカウント作成時に提供されるテストユーザーの電話番号をそのまま使うのがおススメ
  - 本来はユーザー管理の仕組みが別途あって、そのログインユーザーの ID を取り出して使うべきもの

  - **というわけで、自分のテスト環境で使うユーザー ID の配列に書き直しておく**
    - 適当な文字列の配列でもいい

- items.json
  - 取り扱う商品の一覧
  - 商品名、価格、通貨単位の情報を持つ JSON 配列
  - 本来は商品データベースがあって、そこから取り出すべきもの

  - **自分のテスト環境で扱う商品の情報に書き直しておく**

- .env
  - データベース接続情報および PayPay API 情報
    - 実際に使うデータベース（PostgreSQL）の接続文字列に書き換える
    - PayPay API for Developer で取得した情報に書き換える


## How to run with docker (for developer)

- Run PostgreSQL image as container:

  - `$ docker run -d --name mypostgres -p 5432:5432 -e POSTGRES_USER=admin -e POSTGRES_PASSWORD=password -e POSTGRES_DB=mydb postgres`

- Create two tables in PostgreSQL:

  - `$ docker container exec -it mypostgres psql -h localhost -U admin -d mydb`

  - `mydb=# create table if not exists transactions ( id varchar(100) not null primary key, user_id varchar(50) default '', order_id varchar(50) not null, amount int default 0, currency varchar(10) default '', created bigint default 0 );`

  - `mydb=# \q`

- Edit .env:

```
DATABASE_URL=postgres://admin:password@localhost:5432/mydb
PGSSLMODE=disable
PAYPAY_API_KEY=(API Key)
PAYPAY_API_SECRET=(API Secret)
PAYPAY_MERCHANT_ID=(Merchant ID)
PAYPAY_REDIRECT_URL=http://localhost:8080/paypay/redirect
```

- Install libraries(once)
  - `$ npm install`

- Run app(s) with PORT as environment variable(Default = 8080):

  - `$ node app`

  - Open `http://localhost:8080/` with your browser


## References

https://github.com/paypay/paypayopa-sdk-node?tab=readme-ov-file#integrating-native-integration


## Copyright

2025 [K.Kimura @ Juge.Me](https://github.com/dotnsf) all rights reserved.

