import {EntityManager, EntityRepository, MikroORM, Options} from "@mikro-orm/postgresql";
import {User} from "./entities/index";
import config from './mikro-orm.config'

export interface Services {
  orm: MikroORM;
  em: EntityManager;
  user: EntityRepository<User>;
  follow: EntityRepository<Follow>;
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
  };
  return dataSource;
}
