import { BaseEntity } from "@/shared/entities/BaseEntity";
import { Column, Entity, ManyToOne } from "typeorm";
import { Feedback } from "../feedback/feedback.entity";
import { Product } from "../product/product.entity";

@Entity("images")
export class Image extends BaseEntity {

    @Column({ type: "varchar", length: 255 })
    originalName: string;

    @Column({ type: "varchar", length: 255 })
    url: string;
    
    @Column({ type: "varchar", length: 255 })
    name: string;

    @ManyToOne(() => Product, (product) => product.images)
    product: Product;

    @ManyToOne(() => Feedback, (feedback) => feedback.images)
    feedback: Feedback;
}
    