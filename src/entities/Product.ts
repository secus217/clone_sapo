    import { Entity, Property, PrimaryKey, ManyToOne, OneToMany, Collection, ManyToMany } from '@mikro-orm/core';
    import  Category  from './Category';
    import  Inventory from './Inventory';
    import OrderItem from './OrderItem';
    import {BaseEntity} from "./BaseEntity";

    @Entity()
    export default class Product extends BaseEntity{

        @Property()
        name!: string;

        @Property({ columnType: 'text', nullable: true })
        description?: string;

        @Property()
        sku!: string;

        @Property()
        barcode?: string;

        @Property()
        retailPrice!: number;

        @Property()
        importPrice!: number;

        @Property({ default: true })
        isActive!: boolean;

        @ManyToOne(() => Category,{ nullable: true })
        category?: Category;

        @OneToMany(() => OrderItem, item => item.product)
        orderItems = new Collection<OrderItem>(this);

        @OneToMany(() => Inventory, inventory => inventory.product)
        inventories = new Collection<Inventory>(this);
        @Property({ nullable: true })
        imageUrls?: string

    }
