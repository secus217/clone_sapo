import { Entity, Property, PrimaryKey, ManyToOne, OneToMany, Collection, ManyToMany } from '@mikro-orm/core';
import {BaseEntity} from "./BaseEntity";

@Entity()
export default class ExportNoteDetail extends BaseEntity{
   @Property()
    exportNoteId!:number;
   @Property()
    productId!:number;
   @Property()
    quantity!:number;
}
