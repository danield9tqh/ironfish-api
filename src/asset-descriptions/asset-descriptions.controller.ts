/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import {
  Controller,
  Get,
  HttpStatus,
  Query,
  ValidationPipe,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AssetsService } from '../assets/assets.service';
import { PaginatedList } from '../common/interfaces/paginated-list';
import { TransactionsService } from '../transactions/transactions.service';
import { AssetDescriptionsService } from './asset-descriptions.service';
import { AssetDescriptionsQueryDto } from './dto/asset-descriptions-query.dto';
import { SerializedAssetDescription } from './interfaces/serialized-asset-description';

@ApiTags('AssetDescriptions')
@Controller('asset_descriptions')
export class AssetDescriptionsController {
  constructor(
    private readonly assetDescriptionsService: AssetDescriptionsService,
    private readonly assetsService: AssetsService,
    private readonly transactionsService: TransactionsService,
  ) {}

  @ApiOperation({ summary: 'Lists asset descriptions' })
  @Get()
  async list(
    @Query(
      new ValidationPipe({
        errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        transform: true,
      }),
    )
    { asset: assetIdentifier, after, before, limit }: AssetDescriptionsQueryDto,
  ): Promise<PaginatedList<SerializedAssetDescription>> {
    const asset = await this.assetsService.findByIdentifierOrThrow(
      assetIdentifier,
    );
    const { data, hasNext, hasPrevious } =
      await this.assetDescriptionsService.list({
        assetId: asset.id,
        after,
        before,
        limit,
      });

    const serializedData: SerializedAssetDescription[] = [];
    for (const record of data) {
      const transaction = await this.transactionsService.findOrThrow(
        record.transaction_id,
      );
      serializedData.push({
        object: 'asset_description',
        id: record.id,
        transaction_hash: transaction.hash,
        type: record.type,
        value: record.value.toString(),
      });
    }

    return {
      object: 'list',
      data: serializedData,
      metadata: {
        has_next: hasNext,
        has_previous: hasPrevious,
      },
    };
  }
}
