import { Entity } from 'typeorm';
import { ImageDto } from '../../../common/dto/index.dto';

@Entity()
export class RecipeStepEntity {
  order!: number;
  text?: string;
  image?: ImageDto[];
}
