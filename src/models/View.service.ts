import ViewModel from "../schemas/View.schema";
import { ViewInput } from "../libs/types/view";
import Errors, { HttpCode, Message } from "../libs/Errors";

class ViewService {
  private readonly viewModel;

  constructor() {
    this.viewModel = ViewModel;
  }

  /**
   * Check if View Exists
   * Useful if you want to show "You viewed this" UI in frontend
   */
  public async checkViewExistence(input: ViewInput): Promise<any> {
    return await this.viewModel
      .findOne({ 
        memberId: input.memberId, 
        viewRefId: input.viewRefId, 
        viewGroup: input.viewGroup 
      })
      .exec();
  }

  /**
   * Insert New View
   * Returns the created view doc, or null if it failed (duplicate)
   */
  public async insertMemberView(input: ViewInput): Promise<any> {
    try {
      return await this.viewModel.create(input);
    } catch (err) {
      console.log("View already exists (Duplicate ignored)");
      return null;
    }
  }
}

export default ViewService;