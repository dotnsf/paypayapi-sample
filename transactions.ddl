/* transactions.ddl */

/* transactions */
drop table transactions;
create table if not exists transactions ( id varchar(100) not null primary key, user_id varchar(50) default '', order_id varchar(50) not null, amount int default 0, currency varchar(10) default '', created bigint default 0 );
