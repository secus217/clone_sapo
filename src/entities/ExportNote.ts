import { Entity, Property, PrimaryKey, ManyToOne, OneToMany, Collection, ManyToMany } from '@mikro-orm/core';
import {BaseEntity} from "./BaseEntity";

@Entity()
export default class ExportNote extends BaseEntity{
    @Property({nullable:true})
    orderId?: number;
    @Property()
    fromStoreId!: number;
    @Property({nullable:true})
    toStoreId?: number;
    @Property()
    createrId!: number;
    @Property()
    totalQuantity!:number;
    @Property({default:"pending"})
    status!: 'pending'|'completed';
    @Property({nullable: true})
    note?: string;
    @Property({nullable:true})
    type?:"xuat"|"nhap"
    @Property({nullable:true})
    exportNoteDetailId?: number;
}
