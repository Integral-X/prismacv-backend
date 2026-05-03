import { Injectable } from '@nestjs/common';
import type {
  Job as PrismaJob,
  JobNote as PrismaJobNote,
} from '@prisma/client';
import {
  JobResponseDto,
  JobNoteResponseDto,
} from './dto/response/job.response.dto';

type PrismaJobWithNotes = PrismaJob & {
  jobNotes?: PrismaJobNote[];
};

@Injectable()
export class JobsMapper {
  jobToResponse(job: PrismaJobWithNotes): JobResponseDto {
    const dto = new JobResponseDto();
    dto.id = job.id;
    dto.title = job.title;
    dto.company = job.company;
    dto.url = job.url ?? undefined;
    dto.location = job.location ?? undefined;
    dto.isRemote = job.isRemote;
    dto.salaryMin = job.salaryMin ?? undefined;
    dto.salaryMax = job.salaryMax ?? undefined;
    dto.salaryCurrency = job.salaryCurrency ?? undefined;
    dto.status = job.status;
    dto.appliedAt = job.appliedAt?.toISOString() ?? undefined;
    dto.notes = job.notes ?? undefined;
    dto.createdAt = job.createdAt.toISOString();
    dto.updatedAt = job.updatedAt.toISOString();
    dto.jobNotes = (job.jobNotes ?? []).map(n => this.noteToResponse(n));
    return dto;
  }

  noteToResponse(note: PrismaJobNote): JobNoteResponseDto {
    const dto = new JobNoteResponseDto();
    dto.id = note.id;
    dto.content = note.content;
    dto.createdAt = note.createdAt.toISOString();
    return dto;
  }
}
