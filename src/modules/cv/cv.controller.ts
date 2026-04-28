import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtUserAuthGuard } from '@/modules/auth/guards/jwt-user-auth.guard';
import { GetUser } from '@/common/decorators/get-user.decorator';
import { Public } from '@/common/decorators/public.decorator';
import { User } from '@/modules/auth/entities/user.entity';
import { CvService } from './cv.service';
import { CvImportService } from './cv-import.service';
import { CvMapper } from './mappers/cv.mapper';
import { CV_TEMPLATES } from './templates/template-registry';
import { PaginationQueryDto } from '@/shared/dto/pagination-query.dto';
import { CreateCvRequestDto } from './dto/request/create-cv.request.dto';
import { UpdateCvRequestDto } from './dto/request/update-cv.request.dto';
import { ImportLinkedInToCvRequestDto } from './dto/request/import-linkedin-to-cv.request.dto';
import { UpsertPersonalInfoRequestDto } from './dto/request/upsert-personal-info.request.dto';
import {
  BulkUpsertExperienceRequestDto,
  BulkUpsertEducationRequestDto,
  BulkUpsertSkillsRequestDto,
  BulkUpsertCertificationsRequestDto,
  BulkUpsertProjectsRequestDto,
  BulkUpsertLanguagesRequestDto,
  BulkUpsertCustomSectionsRequestDto,
} from './dto/request/upsert-sections.request.dto';
import {
  CvResponseDto,
  CvListItemResponseDto,
  PersonalInfoResponseDto,
  ExperienceResponseDto,
  EducationResponseDto,
  SkillResponseDto,
  CertificationResponseDto,
  ProjectResponseDto,
  LanguageResponseDto,
  CustomSectionResponseDto,
} from './dto/response/cv.response.dto';
import { PaginatedResponseDto } from '@/shared/dto/paginated-response.dto';

@ApiTags('CV')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtUserAuthGuard)
@Controller('cv')
export class CvController {
  constructor(
    private readonly cvService: CvService,
    private readonly cvImportService: CvImportService,
    private readonly cvMapper: CvMapper,
  ) {}

  // ─── CRUD ────────────────────────────────────────────────────────────────

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new CV',
    description: 'Creates a new CV with DRAFT status for the authenticated user.',
  })
  @ApiBody({ type: CreateCvRequestDto })
  @ApiResponse({ status: 201, description: 'CV created', type: CvResponseDto })
  async create(
    @GetUser() user: User,
    @Body() dto: CreateCvRequestDto,
  ): Promise<CvResponseDto> {
    const cv = await this.cvService.create(user.id, dto);
    return this.cvMapper.cvToResponse(cv);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List CVs',
    description: 'Returns a paginated list of CVs for the authenticated user.',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated CV list',
  })
  async findAll(
    @GetUser() user: User,
    @Query() pagination: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<CvListItemResponseDto>> {
    const result = await this.cvService.findAllByUser(user.id, pagination);
    return PaginatedResponseDto.create(
      result.data.map((cv) => this.cvMapper.cvToListItemResponse(cv)),
      result.meta.total,
      result.meta.page,
      result.meta.limit,
    );
  }

  @Get('templates')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List CV templates',
    description: 'Returns all available CV templates. Public endpoint.',
  })
  @ApiResponse({ status: 200, description: 'Template list' })
  getTemplates() {
    return CV_TEMPLATES;
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get a CV by ID',
    description: 'Returns a single CV with all sections populated.',
  })
  @ApiParam({ name: 'id', description: 'CV UUID' })
  @ApiResponse({ status: 200, description: 'CV details', type: CvResponseDto })
  @ApiResponse({ status: 404, description: 'CV not found' })
  async findOne(
    @GetUser() user: User,
    @Param('id') id: string,
  ): Promise<CvResponseDto> {
    const cv = await this.cvService.findOne(id, user.id);
    return this.cvMapper.cvToResponse(cv);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update CV metadata',
    description: 'Updates title, status, template, or default flag.',
  })
  @ApiParam({ name: 'id', description: 'CV UUID' })
  @ApiBody({ type: UpdateCvRequestDto })
  @ApiResponse({ status: 200, description: 'CV updated', type: CvResponseDto })
  async update(
    @GetUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateCvRequestDto,
  ): Promise<CvResponseDto> {
    const cv = await this.cvService.update(id, user.id, dto);
    return this.cvMapper.cvToResponse(cv);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a CV',
    description: 'Permanently deletes a CV and all its sections.',
  })
  @ApiParam({ name: 'id', description: 'CV UUID' })
  @ApiResponse({ status: 204, description: 'CV deleted' })
  async remove(
    @GetUser() user: User,
    @Param('id') id: string,
  ): Promise<void> {
    await this.cvService.remove(id, user.id);
  }

  @Post(':id/duplicate')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Duplicate a CV',
    description: 'Creates a deep copy of a CV including all sections.',
  })
  @ApiParam({ name: 'id', description: 'CV UUID to duplicate' })
  @ApiResponse({ status: 201, description: 'CV duplicated', type: CvResponseDto })
  async duplicate(
    @GetUser() user: User,
    @Param('id') id: string,
  ): Promise<CvResponseDto> {
    const cv = await this.cvService.duplicate(id, user.id);
    return this.cvMapper.cvToResponse(cv);
  }

  @Post('import/linkedin')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Import LinkedIn data into a new CV',
    description:
      'Creates a new CV populated from a previously imported LinkedIn profile.',
  })
  @ApiBody({ type: ImportLinkedInToCvRequestDto })
  @ApiResponse({ status: 201, description: 'CV created from LinkedIn data', type: CvResponseDto })
  @ApiResponse({ status: 404, description: 'LinkedIn import not found' })
  async importFromLinkedIn(
    @GetUser() user: User,
    @Body() dto: ImportLinkedInToCvRequestDto,
  ): Promise<CvResponseDto> {
    const cv = await this.cvImportService.importFromLinkedIn(
      user.id,
      dto.importId,
      dto.title,
      dto.templateId,
    );
    return this.cvMapper.cvToResponse(cv);
  }

  // ─── Section Endpoints ──────────────────────────────────────────────────

  @Put(':id/personal-info')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Upsert personal info section' })
  @ApiParam({ name: 'id', description: 'CV UUID' })
  @ApiBody({ type: UpsertPersonalInfoRequestDto })
  @ApiResponse({ status: 200, type: PersonalInfoResponseDto })
  async upsertPersonalInfo(
    @GetUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpsertPersonalInfoRequestDto,
  ): Promise<PersonalInfoResponseDto> {
    const pi = await this.cvService.upsertPersonalInfo(id, user.id, dto);
    return this.cvMapper.personalInfoToResponse(pi);
  }

  @Put(':id/experiences')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bulk upsert experiences' })
  @ApiParam({ name: 'id', description: 'CV UUID' })
  @ApiBody({ type: BulkUpsertExperienceRequestDto })
  @ApiResponse({ status: 200, type: [ExperienceResponseDto] })
  async upsertExperiences(
    @GetUser() user: User,
    @Param('id') id: string,
    @Body() dto: BulkUpsertExperienceRequestDto,
  ): Promise<ExperienceResponseDto[]> {
    const items = await this.cvService.bulkUpsertExperiences(id, user.id, dto);
    return items.map((e) => this.cvMapper.experienceToResponse(e));
  }

  @Put(':id/education')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bulk upsert education' })
  @ApiParam({ name: 'id', description: 'CV UUID' })
  @ApiBody({ type: BulkUpsertEducationRequestDto })
  @ApiResponse({ status: 200, type: [EducationResponseDto] })
  async upsertEducation(
    @GetUser() user: User,
    @Param('id') id: string,
    @Body() dto: BulkUpsertEducationRequestDto,
  ): Promise<EducationResponseDto[]> {
    const items = await this.cvService.bulkUpsertEducation(id, user.id, dto);
    return items.map((e) => this.cvMapper.educationToResponse(e));
  }

  @Put(':id/skills')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bulk upsert skills' })
  @ApiParam({ name: 'id', description: 'CV UUID' })
  @ApiBody({ type: BulkUpsertSkillsRequestDto })
  @ApiResponse({ status: 200, type: [SkillResponseDto] })
  async upsertSkills(
    @GetUser() user: User,
    @Param('id') id: string,
    @Body() dto: BulkUpsertSkillsRequestDto,
  ): Promise<SkillResponseDto[]> {
    const items = await this.cvService.bulkUpsertSkills(id, user.id, dto);
    return items.map((s) => this.cvMapper.skillToResponse(s));
  }

  @Put(':id/certifications')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bulk upsert certifications' })
  @ApiParam({ name: 'id', description: 'CV UUID' })
  @ApiBody({ type: BulkUpsertCertificationsRequestDto })
  @ApiResponse({ status: 200, type: [CertificationResponseDto] })
  async upsertCertifications(
    @GetUser() user: User,
    @Param('id') id: string,
    @Body() dto: BulkUpsertCertificationsRequestDto,
  ): Promise<CertificationResponseDto[]> {
    const items = await this.cvService.bulkUpsertCertifications(
      id,
      user.id,
      dto,
    );
    return items.map((c) => this.cvMapper.certificationToResponse(c));
  }

  @Put(':id/projects')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bulk upsert projects' })
  @ApiParam({ name: 'id', description: 'CV UUID' })
  @ApiBody({ type: BulkUpsertProjectsRequestDto })
  @ApiResponse({ status: 200, type: [ProjectResponseDto] })
  async upsertProjects(
    @GetUser() user: User,
    @Param('id') id: string,
    @Body() dto: BulkUpsertProjectsRequestDto,
  ): Promise<ProjectResponseDto[]> {
    const items = await this.cvService.bulkUpsertProjects(id, user.id, dto);
    return items.map((p) => this.cvMapper.projectToResponse(p));
  }

  @Put(':id/languages')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bulk upsert languages' })
  @ApiParam({ name: 'id', description: 'CV UUID' })
  @ApiBody({ type: BulkUpsertLanguagesRequestDto })
  @ApiResponse({ status: 200, type: [LanguageResponseDto] })
  async upsertLanguages(
    @GetUser() user: User,
    @Param('id') id: string,
    @Body() dto: BulkUpsertLanguagesRequestDto,
  ): Promise<LanguageResponseDto[]> {
    const items = await this.cvService.bulkUpsertLanguages(id, user.id, dto);
    return items.map((l) => this.cvMapper.languageToResponse(l));
  }

  @Put(':id/custom-sections')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bulk upsert custom sections' })
  @ApiParam({ name: 'id', description: 'CV UUID' })
  @ApiBody({ type: BulkUpsertCustomSectionsRequestDto })
  @ApiResponse({ status: 200, type: [CustomSectionResponseDto] })
  async upsertCustomSections(
    @GetUser() user: User,
    @Param('id') id: string,
    @Body() dto: BulkUpsertCustomSectionsRequestDto,
  ): Promise<CustomSectionResponseDto[]> {
    const items = await this.cvService.bulkUpsertCustomSections(
      id,
      user.id,
      dto,
    );
    return items.map((cs) => this.cvMapper.customSectionToResponse(cs));
  }
}
