    import {Entity, Property, PrimaryKey, ManyToOne, OneToMany ,Reference } from '@mikro-orm/core';
    import {BaseEntity} from "./BaseEntity";
    import Product  from './Product';


    @Entity()
    export default class Inventory extends BaseEntity{

        @ManyToOne(() => Product)
        product!: Reference<Product>;

        @Property()
        quantity!: number;

        @Property({ nullable: true })
        location?: string;

    }
