/**
 * 레시피 한 단계의 텍스트와 이미지를 표현하는 도메인 모델입니다.
 */
import { Entity } from 'typeorm';
import { ImageDto } from '../../../common/dto/index.dto';

@Entity()
export class RecipeStepEntity {
  order!: number;
  text?: string;
  image?: ImageDto[];
}
