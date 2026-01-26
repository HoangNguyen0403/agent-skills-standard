import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateFeedbackDto {
  @ApiProperty({
    description: 'The skill category/identifier',
    example: 'react/hooks',
  })
  @IsString()
  @IsNotEmpty()
  skill: string;

  @ApiProperty({
    description: 'Description of the issue or conflict',
    example: 'Missing exhaustive-deps warning',
  })
  @IsString()
  @IsNotEmpty()
  issue: string;

  @ApiPropertyOptional({
    description: 'Technical context (versions, scenarios)',
    example: 'React 18.2, Strict Mode',
  })
  @IsString()
  @IsOptional()
  context?: string;

  @ApiPropertyOptional({
    description: 'AI model name',
    example: 'Claude 3.5 Sonnet',
  })
  @IsString()
  @IsOptional()
  model?: string;

  @ApiPropertyOptional({
    description: 'Suggested fix or improvement',
    example: 'Add pattern for async cleanup',
  })
  @IsString()
  @IsOptional()
  suggestion?: string;
}
