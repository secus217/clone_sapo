import {Entity, Property, PrimaryKey, ManyToOne, OneToMany, Collection, ManyToMany} from '@mikro-orm/core';
import {BaseEntity} from "./BaseEntity";

@Entity()
export default class Store extends BaseEntity {
    @Property()
    ownerId!: number;
    @Property()
    name!: string;
    @Property()
    address!: string;
}
