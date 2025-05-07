import {EntityManager, EntityRepository, MikroORM, Options} from "@mikro-orm/postgresql";
import {User,Category,Product,Store,ExportNote,ExportNoteDetail,OrderDetail,Orders,ReceiptNote,Inventory,PaymentOrder,TongThuTongChi} from "./entities/index";
import config from './mikro-orm.config'

export interface Services {
  orm: MikroORM;
  em: EntityManager;
  user: EntityRepository<User>;
  product: EntityRepository<Product>;
  category: EntityRepository<Category>;
  exportNote: EntityRepository<ExportNote>;
  exportNoteDetail:EntityRepository<ExportNoteDetail>;
  orderDetail:EntityRepository<OrderDetail>;
  orders:EntityRepository<Orders>;
  receiptNote:EntityRepository<ReceiptNote>;
  store:EntityRepository<Store>;
  inventory:EntityRepository<Inventory>;
  paymentOrder:EntityRepository<PaymentOrder>;
  tongThuTongChi:EntityRepository<TongThuTongChi>;
}

let dataSource: Services;

// Initialize the ORM then return the data source this will use data source as a cache so call multiple times will not reinitialize the ORM
export async function initORM(options?: Options): Promise<Services> {
  if (dataSource) return dataSource;
  // allow overriding config options for testing
  const orm = await MikroORM.init({
    ...config,
    ...options,
  });

  // save to cache before returning
  dataSource = {
    orm,
    em: orm.em,
    user: orm.em.getRepository(User),
    product:orm.em.getRepository(Product),
    category:orm.em.getRepository(Category),
    exportNote:orm.em.getRepository(ExportNote),
    exportNoteDetail:orm.em.getRepository(ExportNoteDetail),
    orders:orm.em.getRepository(Orders),
    orderDetail:orm.em.getRepository(OrderDetail),
    receiptNote:orm.em.getRepository(ReceiptNote),
    store:orm.em.getRepository(Store),
    inventory:orm.em.getRepository(Inventory),
    paymentOrder:orm.em.getRepository(PaymentOrder),
    tongThuTongChi:orm.em.getRepository(TongThuTongChi)
  };
  return dataSource;
}
