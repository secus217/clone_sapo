import {BaseEntity} from './BaseEntity';
import {Entity,Property,OneToMany} from "@mikro-orm/core";
@Entity()
export default class Product extends BaseEntity {
    @Property()
    name!: string;
    @Property()
    sku!: string;
    @Property()
    description!: string;
    @Property()
    listPrice!: number;
    @Property()
    costPrice!: number;
    @OneToMany(() => User, (user: User) => user.product)
}