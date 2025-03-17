import { Entity, Property, PrimaryKey, OneToMany, Collection } from '@mikro-orm/core';
import  Product  from './Product';
import {BaseEntity} from "./BaseEntity";

@Entity()
export default class Category extends BaseEntity{

    @Property()
    name!: string;

    @Property({ nullable: true })
    description?: string;

    @OneToMany(() => Product, product => product.category)
    products = new Collection<Product>(this);

    @Property()
    createdAt: Date = new Date();

    @Property({ onUpdate: () => new Date() })
    updatedAt: Date = new Date();
}
