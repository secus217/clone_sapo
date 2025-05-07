import {Entity, Property, PrimaryKey, ManyToOne, OneToMany, Collection, ManyToMany} from '@mikro-orm/core';
import {BaseEntity} from "./BaseEntity";

@Entity()
export default class TongThuTongChi extends BaseEntity {
    @Property()
    TongThu!: number;
    @Property()
    TongChi!: number;
    @Property()
    QuyTienMat!: number;
    @Property()
    QuyBank!: number;
}
