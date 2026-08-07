import { ActivityLogsModule } from './activity-logs.module';

describe('ActivityLogsModule', () => {
  it('mengekspos ActivityLogsModule sebagai Nest module', () => {
    expect(ActivityLogsModule).toBeDefined();
  });
});
