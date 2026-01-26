import inquirer from 'inquirer';
import pc from 'picocolors';
import { FeedbackData, FeedbackService } from '../services/FeedbackService';

/**
 * Command for automated skill feedback reporting.
 * Follows KISS: Minimal user output, focusing on functional submission.
 */
export class FeedbackCommand {
  private feedbackService: FeedbackService;

  constructor(feedbackService?: FeedbackService) {
    this.feedbackService = feedbackService || new FeedbackService();
  }

  async run(options: {
    skill?: string;
    issue?: string;
    model?: string;
    context?: string;
    suggestion?: string;
    skillInstruction?: string;
    actualAction?: string;
    decisionReason?: string;
    loadedSkills?: string;
  }) {
    console.log(pc.bold(pc.blue('\n📣 Agent Skills Feedback Reporter\n')));

    let {
      skill,
      issue,
      model,
      context,
      suggestion,
      skillInstruction,
      actualAction,
      decisionReason,
      loadedSkills,
    } = options;

    // Interactive mode if mandatory options are missing
    if (!skill || !issue) {
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'skill',
          message:
            'Which skill ID has the issue? (e.g., flutter/bloc-state-management)',
          when: !skill,
          validate: (input: string) =>
            input.trim().length > 0 || 'Skill ID is required',
        },
        {
          type: 'input',
          name: 'issue',
          message: 'What is the issue? (Brief description)',
          when: !issue,
          validate: (input: string) =>
            input.trim().length > 0 || 'Issue description is required',
        },
        {
          type: 'input',
          name: 'model',
          message: 'AI Model name (optional, e.g., Claude 3.5 Sonnet)',
          when: !model,
        },
        {
          type: 'input',
          name: 'context',
          message: 'Any extra context? (optional, e.g., framework versions)',
          when: !context,
        },
        {
          type: 'input',
          name: 'suggestion',
          message: 'Any suggested improvement? (optional)',
          when: !suggestion,
        },
        {
          type: 'input',
          name: 'skillInstruction',
          message: 'Exact quote from skill (optional)',
          when: !skillInstruction,
        },
        {
          type: 'input',
          name: 'actualAction',
          message: 'What you did instead (optional)',
          when: !actualAction,
        },
        {
          type: 'input',
          name: 'decisionReason',
          message: 'Why you chose this approach (optional)',
          when: !decisionReason,
        },
        {
          type: 'input',
          name: 'loadedSkills',
          message: 'All active skills (optional)',
          when: !loadedSkills,
        },
      ]);

      skill = skill || (answers.skill as string);
      issue = issue || (answers.issue as string);
      model = model || (answers.model as string);
      context = context || (answers.context as string);
      suggestion = suggestion || (answers.suggestion as string);
      skillInstruction =
        skillInstruction || (answers.skillInstruction as string);
      actualAction = actualAction || (answers.actualAction as string);
      decisionReason = decisionReason || (answers.decisionReason as string);
      loadedSkills = loadedSkills || (answers.loadedSkills as string);

      await this.submit({
        skill: skill!,
        issue: issue!,
        model,
        context,
        suggestion,
        skillInstruction,
        actualAction,
        decisionReason,
        loadedSkills,
      });
    } else {
      await this.submit({
        skill,
        issue,
        model,
        context,
        suggestion,
        skillInstruction,
        actualAction,
        decisionReason,
        loadedSkills,
      });
    }
  }

  private async submit(data: FeedbackData) {
    const apiUrl = this.feedbackService.getApiUrl();

    if (!apiUrl) {
      console.log(pc.yellow('\n⚠️  Feedback API not configured.'));
      console.log(
        pc.gray(
          'Please set the ' +
            pc.bold('FEEDBACK_API_URL') +
            ' environment variable.',
        ),
      );
      return;
    }

    console.log(pc.gray(`📤 Sending feedback to ${apiUrl}...`));

    const success = await this.feedbackService.submit(data);

    if (success) {
      console.log(pc.green('\n✅ Feedback has been sent successfully!'));
      console.log(
        pc.gray('Thank you for helping improve the Agent Skills Standard.\n'),
      );
    } else {
      console.log(pc.red('\n❌ Failed to send feedback.'));
      console.log(
        pc.gray(
          `Please check that the Feedback API is reachable: ${pc.cyan(apiUrl)}\n`,
        ),
      );
    }
  }
}
