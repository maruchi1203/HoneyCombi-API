import { ImageDto } from '../../../common/dto/index.dto';

export class RecipeStepDto {
  order!: number;
  text?: string;
  image?: ImageDto[];
}

