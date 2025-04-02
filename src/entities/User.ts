import {BaseEntity} from "./BaseEntity";
import {Entity, OneToOne, Property} from "@mikro-orm/core";

@Entity()
export default class User extends BaseEntity {
  constructor() {
    super();
  }

  @Property()
  username!: string;
  @Property({nullable: true})
  password?: string;
  @Property({default:""})
  phone!: string ;
  @Property({default:""})
  address?: string ;
  @Property()
  role!: string;
  @Property({nullable: true})
  storeId?:number;

}