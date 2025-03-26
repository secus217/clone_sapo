    import { Entity, Property, PrimaryKey, ManyToOne, OneToMany, Collection, ManyToMany } from '@mikro-orm/core';
    import  Category  from './Category';
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
        retailPrice!: number;

        @Property()
        importPrice!: number;

        @Property({ default: true })
        isActive!: boolean;

        @ManyToOne(() => Category,{ nullable: true })
        category?: Category;
        @Property({ nullable: true })
        imageUrls?: string

    }
