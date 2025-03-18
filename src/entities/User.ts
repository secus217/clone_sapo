import {BaseEntity} from "./BaseEntity";
import {Entity, Property} from "@mikro-orm/core";

@Entity()
export default class User extends BaseEntity {
  constructor() {
    super();
  }

  @Property()
  username!: string;

  @Property()
  password!: string;
  @Property({default:""})
  phone!: string ;
  @Property({default:""})
  address?: string ;
  @Property()
  role!: string;
}