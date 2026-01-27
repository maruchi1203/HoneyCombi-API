import { ImageDto } from '../../../common/dto/image.dto';

export class RecipeStepDto {
  order: number;
  text: string;
  image: ImageDto[];
}
